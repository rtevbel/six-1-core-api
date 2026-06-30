import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from '../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import {
  buildProcessChildEventOptions,
  buildProcessStepEventOptions,
} from '../events/platform-process-event.util';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import type { StartProcessParams } from './process-host/process-host.context';
import {
  CHILD_SUBJECT_POLICY_CONFIG_INSTANCE,
  CHILD_SUBJECT_POLICY_INHERIT,
  CHILD_SUBJECT_POLICY_WORKFLOW,
  PROCESS_BLOCKED_REASON_WAITING_CHILD,
  PROCESS_STEP_TASK_TYPE_CALL_PROCESS,
  type ChildSubjectPolicy,
  type OnChildFailurePolicy,
} from './process-step-task-type.constants';
import {
  PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';
import type { ProcessInstanceSubjectInput } from './process-subject.types';
import {
  buildProcessContextResolutionRoot,
  resolveChildContextFromParentPatch,
  type ProcessBindingCoreRef,
} from './process-instance-context.util';

type ProcessInstanceRow = {
  process_instance_id: number;
  tenant_id: number;
  created_by: number;
  subject_type: string;
  subject_id: number;
  subject_metadata: Record<string, unknown> | string | null;
  context: Record<string, unknown> | string | null;
  on_child_failure: OnChildFailurePolicy;
  correlation_id: string | null;
  parent_instance_id?: number | null;
  parent_step_id?: number | null;
};

type TemplateStepCallConfig = {
  child_template_id: number;
  child_subject_policy: ChildSubjectPolicy;
  child_context_patch: Record<string, unknown> | string | null;
};

type StepRow = {
  step_instance_id: number;
  process_instance_id: number;
  process_template_step_id: number;
  step_order: number;
  status: string;
  task_type: string;
};

@Injectable()
export class ChildProcessOrchestrationService {
  private readonly logger = new Logger(ChildProcessOrchestrationService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly lifecycle: ProcessLifecycleFacade,
    private readonly events: EventsService,
    private readonly flags: ProcessFeatureFlagsService,
    private readonly stepActions: ProcessStepActionOrchestrationService,
  ) {}

  isEnabled(): boolean {
    return this.flags.isCallProcessEnabled();
  }

  /**
   * When a call_process step becomes eligible, spawn the child and block the parent step.
   */
  async spawnChildAndBlockParent(
    qr: QueryRunner,
    step: StepRow,
    opts: { correlationId?: string; actorTenantUserId?: number },
  ): Promise<boolean> {
    if (!this.isEnabled() || step.task_type !== PROCESS_STEP_TASK_TYPE_CALL_PROCESS) {
      return false;
    }

    const em = qr.manager;
    const existing = await this.findChildProcessInstanceId(em, step.step_instance_id);
    if (existing) {
      if (step.status !== 'blocked') {
        await this.blockParentStep(em, step.step_instance_id);
      }
      return false;
    }

    const parent = await this.loadParentProcess(em, step.process_instance_id);
    if (!parent) {
      throw new RpcException('Parent process instance not found');
    }

    const tpl = await this.loadTemplateCallConfig(
      em,
      step.process_template_step_id,
    );
    if (!tpl?.child_template_id) {
      throw new RpcException(
        'call_process step requires child_template_id on process_template_steps',
      );
    }

    const childSubject = this.resolveChildSubject(parent, tpl);
    const childContext = await this.buildChildContext(em, parent, tpl);

    const startParams: StartProcessParams = {
      tenantId: Number(parent.tenant_id),
      createdBy: Number(opts.actorTenantUserId ?? parent.created_by),
      templateId: Number(tpl.child_template_id),
      subjectType: childSubject.subjectType,
      subjectId: childSubject.subjectId,
      subjectMetadata: childSubject.subjectMetadata ?? null,
      context: childContext,
      correlationId: opts.correlationId ?? parent.correlation_id ?? undefined,
      entityManager: em,
      parentInstanceId: parent.process_instance_id,
      parentStepId: step.step_instance_id,
      onChildFailure: parent.on_child_failure ?? 'pause_parent',
      skipHostOnStart: true,
    };

    const { processInstanceId: childProcessInstanceId } =
      await this.lifecycle.startProcess(startParams);

    await this.blockParentStep(em, step.step_instance_id);

    this.events.emit(
      PLATFORM_EVENT_NAMES.PROCESS_CHILD_STARTED,
      buildProcessChildEventOptions({
        tenantId: Number(parent.tenant_id),
        childProcessInstanceId,
        parentProcessInstanceId: parent.process_instance_id,
        parentStepInstanceId: step.step_instance_id,
        correlationId: opts.correlationId,
      }),
    );

    this.logger.debug(
      `Spawned child process ${childProcessInstanceId} for parent step ${step.step_instance_id}`,
    );

    return true;
  }

  /**
   * Invoked when a child process reaches a terminal status (completed or canceled).
   */
  async handleChildTerminal(
    childProcessInstanceId: number,
    terminalStatus: 'completed' | 'canceled',
    opts: { correlationId?: string; actorTenantUserId?: number } = {},
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    let completedParentStepId: number | null = null;
    let failedParentStepId: number | null = null;

    await this.ds.transaction('READ COMMITTED', async (em) => {
      const child = await this.loadProcessRow(em, childProcessInstanceId);
      if (!child?.parent_step_id || !child.parent_instance_id) {
        return;
      }

      const parent = await this.loadProcessRow(em, child.parent_instance_id);
      if (!parent) {
        return;
      }

      const policy: OnChildFailurePolicy =
        parent.on_child_failure ?? 'pause_parent';

      if (terminalStatus === 'canceled' && policy === 'pause_parent') {
        await this.mergeChildContextIntoParent(
          em,
          parent.process_instance_id,
          child.context,
        );
        this.emitChildTerminalEvent(child, parent, terminalStatus, opts, false);
        return;
      }

      if (terminalStatus === 'canceled' && policy === 'fail_parent') {
        await this.mergeChildContextIntoParent(
          em,
          parent.process_instance_id,
          child.context,
        );
        await em.query(
          `UPDATE process_instances
              SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
            WHERE process_instance_id = ?`,
          [parent.process_instance_id],
        );
        await em.query(
          `UPDATE process_instance_steps
              SET status = 'canceled',
                  blocked_reason = 'child_failed',
                  canceled_at = NOW(),
                  updated_at = NOW()
            WHERE step_instance_id = ?`,
          [child.parent_step_id],
        );
        failedParentStepId = Number(child.parent_step_id);
        this.emitChildTerminalEvent(child, parent, terminalStatus, opts, false);
        return;
      }

      await this.mergeChildContextIntoParent(
        em,
        parent.process_instance_id,
        child.context,
      );

      if (terminalStatus === 'completed' || policy === 'ignore') {
        await this.completeParentCallProcessStep(
          em,
          Number(child.parent_step_id),
          opts,
        );
        completedParentStepId = Number(child.parent_step_id);
        this.emitChildTerminalEvent(child, parent, terminalStatus, opts, true);
      }
    });

    const actionOpts = {
      correlationId: opts.correlationId,
      actorUserId: opts.actorTenantUserId,
    };
    if (completedParentStepId) {
      await this.stepActions.runStepCompleted(
        completedParentStepId,
        actionOpts,
      );
    }
    if (failedParentStepId) {
      await this.stepActions.runStepFailed(failedParentStepId, actionOpts);
    }
  }

  /**
   * Mark child process completed when all steps finish (called from orchestrator).
   */
  async markProcessCompletedIfEligible(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<void> {
    const [childLink] = await em.query(
      `SELECT parent_instance_id, parent_step_id
         FROM process_instances
        WHERE process_instance_id = ?
          AND parent_step_id IS NOT NULL
        LIMIT 1`,
      [processInstanceId],
    );
    if (!childLink?.parent_step_id) {
      return;
    }

    const [agg] = await em.query(
      `SELECT SUM(status = 'completed') AS done, COUNT(*) AS total
         FROM process_instance_steps
        WHERE process_instance_id = ?`,
      [processInstanceId],
    );
    if (!agg || Number(agg.done) !== Number(agg.total) || Number(agg.total) === 0) {
      return;
    }

    await em.query(
      `UPDATE process_instances
          SET status = 'completed', completed_at = NOW()
        WHERE process_instance_id = ? AND status = 'active'`,
      [processInstanceId],
    );
  }

  private emitChildTerminalEvent(
    child: ProcessInstanceRow,
    parent: ProcessInstanceRow,
    terminalStatus: 'completed' | 'canceled',
    opts: { correlationId?: string },
    resumedParent: boolean,
  ): void {
    const eventName =
      terminalStatus === 'completed'
        ? PLATFORM_EVENT_NAMES.PROCESS_CHILD_COMPLETED
        : PLATFORM_EVENT_NAMES.PROCESS_CHILD_CANCELED;

    this.events.emit(
      eventName,
      buildProcessChildEventOptions({
        tenantId: Number(parent.tenant_id),
        childProcessInstanceId: child.process_instance_id,
        parentProcessInstanceId: parent.process_instance_id,
        parentStepInstanceId: Number(child.parent_step_id),
        terminalStatus,
        resumedParent,
        correlationId: opts.correlationId,
      }),
    );
  }

  private async completeParentCallProcessStep(
    em: EntityManager,
    parentStepInstanceId: number,
    opts: { correlationId?: string },
  ): Promise<void> {
    await em.query(
      `UPDATE process_instance_steps
          SET status = 'completed',
              blocked_reason = '',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
        WHERE step_instance_id = ?`,
      [parentStepInstanceId],
    );

    const [step] = await em.query(
      `SELECT pis.process_instance_id,
              pis.step_order,
              pi.tenant_id,
              pi.process_template_id
         FROM process_instance_steps pis
         JOIN process_instances pi
           ON pi.process_instance_id = pis.process_instance_id
        WHERE pis.step_instance_id = ?`,
      [parentStepInstanceId],
    );
    if (!step) {
      return;
    }

    this.events.emit(
      PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
      buildProcessStepEventOptions({
        tenantId: Number(step.tenant_id),
        processTemplateId: Number(step.process_template_id),
        stepInstanceId: parentStepInstanceId,
        processInstanceId: step.process_instance_id,
        stepOrder: step.step_order,
        correlationId: opts.correlationId,
        cause: 'child_process',
      }),
    );
  }

  private async blockParentStep(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<void> {
    await em.query(
      `UPDATE process_instance_steps
          SET status = 'blocked',
              blocked_reason = ?,
              updated_at = NOW()
        WHERE step_instance_id = ?`,
      [PROCESS_BLOCKED_REASON_WAITING_CHILD, stepInstanceId],
    );
  }

  private async findChildProcessInstanceId(
    em: EntityManager,
    parentStepInstanceId: number,
  ): Promise<number | null> {
    const [row] = await em.query(
      `SELECT process_instance_id
         FROM process_instances
        WHERE parent_step_id = ?
        LIMIT 1`,
      [parentStepInstanceId],
    );
    return row?.process_instance_id != null
      ? Number(row.process_instance_id)
      : null;
  }

  private async loadParentProcess(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<ProcessInstanceRow | null> {
    return this.loadProcessRow(em, processInstanceId);
  }

  private async loadProcessRow(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<ProcessInstanceRow | null> {
    const [row] = await em.query(
      `SELECT process_instance_id,
              tenant_id,
              created_by,
              subject_type,
              subject_id,
              subject_metadata,
              context,
              on_child_failure,
              correlation_id,
              parent_instance_id,
              parent_step_id
         FROM process_instances
        WHERE process_instance_id = ?
        LIMIT 1`,
      [processInstanceId],
    );
    if (!row) {
      return null;
    }
    return {
      process_instance_id: Number(row.process_instance_id),
      tenant_id: Number(row.tenant_id),
      created_by: Number(row.created_by),
      subject_type: String(row.subject_type),
      subject_id: Number(row.subject_id),
      subject_metadata: parseJson(row.subject_metadata),
      context: parseJson(row.context),
      on_child_failure: row.on_child_failure as OnChildFailurePolicy,
      correlation_id: row.correlation_id ?? null,
      parent_instance_id:
        row.parent_instance_id != null
          ? Number(row.parent_instance_id)
          : null,
      parent_step_id:
        row.parent_step_id != null ? Number(row.parent_step_id) : null,
    };
  }

  private async loadTemplateCallConfig(
    em: EntityManager,
    processTemplateStepId: number,
  ): Promise<TemplateStepCallConfig | null> {
    const [row] = await em.query(
      `SELECT child_template_id, child_subject_policy, child_context_patch
         FROM process_template_steps
        WHERE process_template_step_id = ?
        LIMIT 1`,
      [processTemplateStepId],
    );
    if (!row) {
      return null;
    }
    return {
      child_template_id: Number(row.child_template_id),
      child_subject_policy: row.child_subject_policy as ChildSubjectPolicy,
      child_context_patch: parseJson(row.child_context_patch),
    };
  }

  private resolveChildSubject(
    parent: ProcessInstanceRow,
    tpl: TemplateStepCallConfig,
  ): ProcessInstanceSubjectInput {
    const policy = tpl.child_subject_policy ?? CHILD_SUBJECT_POLICY_WORKFLOW;

    if (policy === CHILD_SUBJECT_POLICY_INHERIT) {
      return {
        subjectType: parent.subject_type,
        subjectId: parent.subject_id,
        subjectMetadata: asRecord(parent.subject_metadata),
      };
    }

    if (policy === CHILD_SUBJECT_POLICY_CONFIG_INSTANCE) {
      const ctx = asRecord(parent.context) ?? {};
      const meta = asRecord(parent.subject_metadata) ?? {};
      const instanceId =
        Number(ctx.configCustomObjectInstanceId) ||
        Number(ctx.config_custom_object_instance_id) ||
        (parent.subject_type === PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE
          ? parent.subject_id
          : 0);

      if (!instanceId) {
        throw new RpcException(
          'child_subject_policy=config_instance requires configCustomObjectInstanceId in parent context or subject',
        );
      }

      return {
        subjectType: PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
        subjectId: instanceId,
        subjectMetadata: meta,
      };
    }

    return {
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      subjectMetadata: null,
    };
  }

  private async buildChildContext(
    em: EntityManager,
    parent: ProcessInstanceRow,
    tpl: TemplateStepCallConfig,
  ): Promise<Record<string, unknown>> {
    const parentCtx = asRecord(parent.context) ?? {};
    const patch = asRecord(tpl.child_context_patch) ?? {};
    const bindingCoreRefs = await this.loadValidBindingCoreRefs(
      em,
      parent.process_instance_id,
    );
    const parentRoot = buildProcessContextResolutionRoot({
      tenantId: parent.tenant_id,
      processInstanceId: parent.process_instance_id,
      subjectType: parent.subject_type,
      subjectId: parent.subject_id,
      subjectMetadata: asRecord(parent.subject_metadata),
      context: parentCtx,
      bindingCoreRefs,
    });
    const resolved = resolveChildContextFromParentPatch(
      parentCtx,
      patch,
      parentRoot,
    );
    return {
      ...resolved,
      parentProcessInstanceId: parent.process_instance_id,
    };
  }

  private async loadValidBindingCoreRefs(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<ProcessBindingCoreRef[]> {
    const rows: Array<{ core_id: number; object_type: string }> = await em.query(
      `SELECT oi.core_id, co.object_type
         FROM process_instance_step_object_instances oi
         JOIN process_instance_steps s ON s.step_instance_id = oi.step_instance_id
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE s.process_instance_id = ?
          AND oi.status = 'valid'
          AND oi.core_id IS NOT NULL
        ORDER BY s.step_order ASC, oi.step_object_instance_id ASC`,
      [processInstanceId],
    );

    return rows
      .map((row) => ({
        objectType: String(row.object_type ?? ''),
        coreId: Number(row.core_id),
      }))
      .filter((row) => row.objectType && Number.isFinite(row.coreId) && row.coreId > 0);
  }

  private async mergeChildContextIntoParent(
    em: EntityManager,
    parentProcessInstanceId: number,
    childContext: Record<string, unknown> | string | null,
  ): Promise<void> {
    const parent = await this.loadProcessRow(em, parentProcessInstanceId);
    if (!parent) {
      return;
    }
    const merged = {
      ...(asRecord(parent.context) ?? {}),
      ...(asRecord(childContext) ?? {}),
      childMergedAt: new Date().toISOString(),
    };
    await em.query(
      `UPDATE process_instances SET context = ? WHERE process_instance_id = ?`,
      [JSON.stringify(merged), parentProcessInstanceId],
    );
  }
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
