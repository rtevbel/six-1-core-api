import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { normalizeRequiredPermissions } from '../automation/process-step-permissions.util';
import { ProcessStepExtensionEvaluatorService } from '../automation/process-step-extension-evaluator.service';
import type { ProcessStepExtensionBindingSummary } from '../automation/process-step-extension-evaluator.types';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { NO_RECORD_FOUND_MESSAGE } from '../common/constants';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessStepAssigneeService } from '../automation/process-step-assignee.service';
import { ProcessStepLocksService } from './process_step_locks/process-step-locks.service';
import { ConfigObjectStepExecutor } from '../automation/config-object-step-executor.service';
import {
  PROCESS_RUNNER_DEFAULT_CHILD_DEPTH,
  PROCESS_RUNNER_MAX_CHILD_DEPTH,
} from './process-runner.constants';
import type {
  ProcessRunnerChildProgress,
  ProcessRunnerChildSummary,
  ProcessRunnerPayload,
  ProcessRunnerStep,
  ProcessRunnerStepExtensions,
  ProcessRunnerStepAssignee,
  ProcessRunnerStepObjectBinding,
  ProcessRunnerStepRequirement,
  ProcessRunnerStepTrigger,
} from './interfaces/process-runner-payload.interface';

type StepRow = {
  step_instance_id: number;
  process_instance_id: number;
  process_template_step_id: number;
  step_order: number;
  name: string | null;
  task_type: string;
  status: string;
  is_optional: number;
  blocked_reason: string | null;
  required_permissions: unknown;
  ready_at: Date | string | null;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  canceled_at: Date | string | null;
  step_extensions_json: unknown;
};

type StepFailureRow = {
  step_instance_id: number;
  occurred_at: Date | string;
  metadata: unknown;
};

type ChildRow = {
  process_instance_id: number;
  process_template_id: number;
  parent_step_id: number;
  status: string;
  subject_type: string;
  subject_id: number;
  subject_metadata: unknown;
  correlation_id: string | null;
  started_at: Date | string;
  completed_at: Date | string | null;
  canceled_at: Date | string | null;
};

@Injectable()
export class ProcessRunnerService {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processInstanceRepository: Repository<ProcessInstanceEntity>,
    private readonly dataSource: DataSource,
    private readonly stepPermissions: ProcessStepPermissionService,
    private readonly stepAssignees: ProcessStepAssigneeService,
    private readonly stepExtensionEvaluator: ProcessStepExtensionEvaluatorService,
    private readonly stepLocks: ProcessStepLocksService,
    private readonly configObjectStepExecutor: ConfigObjectStepExecutor,
  ) {}

  /**
   * Builds the aggregated Process Runner view for a single process instance.
   */
  async buildPayload(
    userId: number,
    processInstanceId: number,
    tenantId?: number,
    tenantUserId?: number,
    childDepth: number = PROCESS_RUNNER_DEFAULT_CHILD_DEPTH,
  ): Promise<ProcessRunnerPayload> {
    const instance = await this.loadInstance(processInstanceId, tenantId);
    const effectiveChildDepth = Math.min(
      Math.max(childDepth, 0),
      PROCESS_RUNNER_MAX_CHILD_DEPTH,
    );

    return this.buildPayloadForInstance(
      userId,
      instance,
      tenantUserId,
      effectiveChildDepth,
    );
  }

  private async loadInstance(
    processInstanceId: number,
    tenantId?: number,
  ): Promise<ProcessInstanceEntity> {
    const instance = await this.processInstanceRepository.findOne({
      where:
        tenantId != null
          ? { processInstanceId, tenantId }
          : { processInstanceId },
    });

    if (!instance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessInstance'),
      );
    }

    return instance;
  }

  private async buildPayloadForInstance(
    userId: number,
    instance: ProcessInstanceEntity,
    tenantUserId: number | undefined,
    remainingChildDepth: number,
  ): Promise<ProcessRunnerPayload> {
    const processInstanceId = instance.processInstanceId;

    const steps = await this.loadSteps(processInstanceId);
    await this.healReadyStepObjectBindings(steps);
    const stepIds = steps.map((s) => s.step_instance_id);

    const [requirements, triggers, objectBindings, childRows, assigneesByStep] =
      await Promise.all([
      this.loadRequirements(stepIds),
      this.loadTriggers(stepIds),
      this.loadObjectBindings(stepIds),
      this.loadChildRows(processInstanceId),
      this.stepAssignees.loadAssigneesByStepIds(stepIds),
    ]);
    const lastFailureByStep = await this.loadLastFailures(stepIds);
    const locksByStep = await this.stepLocks.loadLocksForStepIds(stepIds);

    const childProgressById = await this.loadChildProgress(
      childRows.map((row) => row.process_instance_id),
    );

    const parentStepById = new Map(
      steps.map((step) => [
        step.step_instance_id,
        {
          stepOrder: step.step_order,
          stepName: step.name ?? `Step ${step.step_order}`,
        },
      ]),
    );

    const children = await Promise.all(
      childRows.map(async (row) => {
        const summary = this.mapChildSummary(
          row,
          parentStepById,
          childProgressById,
        );

        if (remainingChildDepth > 0) {
          const childInstance = await this.processInstanceRepository.findOne({
            where: {
              processInstanceId: Number(row.process_instance_id),
              tenantId: instance.tenantId,
            },
          });

          if (childInstance) {
            summary.runner = await this.buildPayloadForInstance(
              userId,
              childInstance,
              tenantUserId,
              remainingChildDepth - 1,
            );
          }
        }

        return summary;
      }),
    );

    const childByParentStep = new Map<number, ChildRow>();
    for (const child of childRows) {
      childByParentStep.set(child.parent_step_id, child);
    }

    const requirementsByStep = groupBy(requirements);
    const triggersByStep = groupBy(triggers);

    const subject = {
      type: instance.subjectType,
      id: instance.subjectId,
      metadata: instance.subjectMetadata,
    };

    const runnerSteps: ProcessRunnerStep[] = [];
    for (const step of steps) {
      const requiredPermissions = normalizeRequiredPermissions(
        step.required_permissions,
      );
      const callerCanComplete =
        await this.stepPermissions.callerHasRequiredPermissions(
          userId,
          requiredPermissions,
          tenantUserId,
        );
      const childRow = childByParentStep.get(step.step_instance_id);
      const stepRequirements = (
        requirementsByStep.get(step.step_instance_id) ?? []
      ).map(stripStepIdFromRequirement);
      const stepTriggers = (triggersByStep.get(step.step_instance_id) ?? []).map(
        stripStepIdFromTrigger,
      );
      const stepObjectBindings =
        objectBindings.get(step.step_instance_id) ?? [];
      const extensions = parseRunnerStepExtensions(step.step_extensions_json);
      const evaluation = this.stepExtensionEvaluator.evaluate({
        processContext: instance.context,
        subject,
        step: {
          stepInstanceId: step.step_instance_id,
          stepOrder: step.step_order,
          status: step.status,
          taskType: step.task_type,
          isOptional: Boolean(step.is_optional),
        },
        bindings: mapBindingsForExtensionEvaluation(stepObjectBindings),
        extensions:
          extensions != null
            ? (extensions as unknown as Record<string, unknown>)
            : undefined,
      });
      const canSkip = resolveStepCanSkip(
        step,
        extensions,
        callerCanComplete,
        evaluation.isVisible,
        this.stepExtensionEvaluator.isEnabled(),
      );

      runnerSteps.push(
        this.mapStep(
          step,
          stepRequirements,
          stepTriggers,
          stepObjectBindings,
          childRow,
          requiredPermissions,
          callerCanComplete,
          assigneesByStep.get(step.step_instance_id) ?? [],
          extensions,
          evaluation.isVisible,
          canSkip,
          evaluation.autoAdvanceEligible,
          lastFailureByStep.get(step.step_instance_id) ?? null,
          locksByStep.get(step.step_instance_id) ?? null,
        ),
      );
    }

    return {
      processInstanceId: instance.processInstanceId,
      processTemplateId: instance.processTemplateId,
      tenantId: instance.tenantId,
      status: instance.status,
      startedAt: instance.startedAt.toISOString(),
      completedAt: instance.completedAt
        ? instance.completedAt.toISOString()
        : null,
      canceledAt: instance.canceledAt
        ? instance.canceledAt.toISOString()
        : null,
      subject: {
        type: instance.subjectType,
        id: instance.subjectId,
        metadata: instance.subjectMetadata,
      },
      context: instance.context,
      correlationId: instance.correlationId,
      parentInstanceId: instance.parentInstanceId,
      children,
      steps: runnerSteps,
      currentStepInstanceId: resolveCurrentStepInstanceId(runnerSteps),
    };
  }

  /**
   * Re-attempts provisioning for ready steps whose standalone bindings failed without a linked record.
   */
  private async healReadyStepObjectBindings(steps: StepRow[]): Promise<void> {
    if (!this.configObjectStepExecutor.isEnabled()) {
      return;
    }

    const readyStepIds = steps
      .filter((step) => step.status === 'ready')
      .map((step) => step.step_instance_id);
    if (!readyStepIds.length) {
      return;
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      for (const stepInstanceId of readyStepIds) {
        await this.configObjectStepExecutor.provisionBindingsOnStepReady(qr, {
          stepInstanceId,
        });
      }
    } finally {
      await qr.release();
    }
  }

  private async loadSteps(processInstanceId: number): Promise<StepRow[]> {
    return this.dataSource.query(
      `SELECT step_instance_id,
              process_instance_id,
              process_template_step_id,
              step_order,
              name,
              task_type,
              status,
              is_optional,
              blocked_reason,
              required_permissions,
              ready_at,
              started_at,
              completed_at,
              canceled_at,
              step_extensions_json
         FROM process_instance_steps
        WHERE process_instance_id = ?
        ORDER BY step_order ASC, step_instance_id ASC`,
      [processInstanceId],
    );
  }

  private async loadRequirements(
    stepIds: number[],
  ): Promise<(ProcessRunnerStepRequirement & { stepInstanceId: number })[]> {
    if (!stepIds.length) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT requirement_instance_id AS requirementInstanceId,
              step_instance_id AS stepInstanceId,
              process_template_step_requirement_id AS processTemplateStepRequirementId,
              requirement_type AS requirementType,
              requirement_key AS requirementKey,
              json_schema AS jsonSchema,
              is_mandatory AS isMandatory,
              status,
              last_submission_id AS lastSubmissionId,
              approved_at AS approvedAt
         FROM process_instance_step_requirements
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY requirement_instance_id ASC`,
      stepIds,
    );

    return rows.map((row: Record<string, unknown>) => ({
      requirementInstanceId: Number(row.requirementInstanceId),
      stepInstanceId: Number(row.stepInstanceId),
      processTemplateStepRequirementId: Number(
        row.processTemplateStepRequirementId,
      ),
      requirementType: String(row.requirementType),
      requirementKey: String(row.requirementKey),
      jsonSchema: parseJsonColumn(row.jsonSchema),
      isMandatory: Boolean(Number(row.isMandatory)),
      status: String(row.status),
      lastSubmissionId:
        row.lastSubmissionId != null ? Number(row.lastSubmissionId) : null,
      approvedAt: row.approvedAt
        ? new Date(String(row.approvedAt)).toISOString()
        : null,
    }));
  }

  private async loadTriggers(stepIds: number[]): Promise<
    (ProcessRunnerStepTrigger & { stepInstanceId: number })[]
  > {
    if (!stepIds.length) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT trigger_instance_id AS triggerInstanceId,
              step_instance_id AS stepInstanceId,
              process_template_step_trigger_condition_id AS processTemplateStepTriggerConditionId,
              condition_type AS conditionType,
              condition_key AS conditionKey,
              json_schema AS jsonSchema,
              status,
              met_at AS metAt
         FROM process_instance_step_triggers
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY trigger_instance_id ASC`,
      stepIds,
    );

    return rows.map((row: Record<string, unknown>) => ({
      triggerInstanceId: Number(row.triggerInstanceId),
      processTemplateStepTriggerConditionId: Number(
        row.processTemplateStepTriggerConditionId,
      ),
      conditionType: String(row.conditionType),
      conditionKey: String(row.conditionKey),
      jsonSchema: parseJsonColumn(row.jsonSchema),
      status: String(row.status),
      metAt: row.metAt ? new Date(String(row.metAt)).toISOString() : null,
      stepInstanceId: Number(row.stepInstanceId),
    }));
  }

  private async loadObjectBindings(
    stepIds: number[],
  ): Promise<Map<number, ProcessRunnerStepObjectBinding[]>> {
    const map = new Map<number, ProcessRunnerStepObjectBinding[]>();
    if (!stepIds.length) {
      return map;
    }

    const rows = await this.dataSource.query(
      `SELECT oi.step_object_instance_id,
              oi.step_instance_id,
              oi.binding_id,
              oi.config_object_id,
              oi.config_custom_object_instance_id,
              oi.core_id,
              oi.status,
              oi.last_error,
              co.object_type,
              co.binding_mode
         FROM process_instance_step_object_instances oi
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE oi.step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY oi.step_object_instance_id ASC`,
      stepIds,
    );

    for (const row of rows) {
      const stepId = Number(row.step_instance_id);
      const binding: ProcessRunnerStepObjectBinding = {
        stepObjectInstanceId: Number(row.step_object_instance_id),
        bindingId: row.binding_id != null ? Number(row.binding_id) : null,
        configObjectId: Number(row.config_object_id),
        objectType: String(row.object_type),
        status: String(row.status),
        lastError: row.last_error ?? null,
        schemaRef: String(row.object_type),
      };
      const instanceId =
        row.config_custom_object_instance_id != null
          ? Number(row.config_custom_object_instance_id)
          : undefined;
      if (instanceId) {
        binding.instanceId = instanceId;
      }
      const coreId = row.core_id != null ? Number(row.core_id) : undefined;
      if (coreId) {
        binding.coreId = coreId;
      }
      const resolutionMode = String(row.binding_mode ?? '');
      if (
        resolutionMode === 'standalone' ||
        resolutionMode === 'sor_bound' ||
        resolutionMode === 'system_table'
      ) {
        binding.resolutionMode = resolutionMode;
      }
      const list = map.get(stepId) ?? [];
      list.push(binding);
      map.set(stepId, list);
    }

    return map;
  }

  private async loadChildRows(processInstanceId: number): Promise<ChildRow[]> {
    return this.dataSource.query(
      `SELECT process_instance_id,
              process_template_id,
              parent_step_id,
              status,
              subject_type,
              subject_id,
              subject_metadata,
              correlation_id,
              started_at,
              completed_at,
              canceled_at
         FROM process_instances
        WHERE parent_instance_id = ?
        ORDER BY process_instance_id ASC`,
      [processInstanceId],
    );
  }

  private async loadChildProgress(
    childInstanceIds: number[],
  ): Promise<Map<number, ProcessRunnerChildProgress>> {
    const progress = new Map<number, ProcessRunnerChildProgress>();
    if (!childInstanceIds.length) {
      return progress;
    }

    const placeholders = childInstanceIds.map(() => '?').join(',');
    const counts = await this.dataSource.query(
      `SELECT process_instance_id,
              COUNT(*) AS total_steps,
              SUM(status = 'completed') AS completed_steps,
              SUM(status = 'canceled') AS canceled_steps
         FROM process_instance_steps
        WHERE process_instance_id IN (${placeholders})
        GROUP BY process_instance_id`,
      childInstanceIds,
    );

    const focusRows = await this.dataSource.query(
      `SELECT process_instance_id,
              step_instance_id,
              name,
              step_order,
              status
         FROM process_instance_steps
        WHERE process_instance_id IN (${placeholders})
          AND status IN ('ready', 'in_progress', 'blocked', 'pending')
        ORDER BY process_instance_id ASC, step_order ASC, step_instance_id ASC`,
      childInstanceIds,
    );

    const focusByInstance = new Map<
      number,
      { stepInstanceId: number; name: string | null; stepOrder: number }
    >();
    for (const row of focusRows) {
      const instanceId = Number(row.process_instance_id);
      if (!focusByInstance.has(instanceId)) {
        focusByInstance.set(instanceId, {
          stepInstanceId: Number(row.step_instance_id),
          name: row.name != null ? String(row.name) : null,
          stepOrder: Number(row.step_order),
        });
      }
    }

    for (const row of counts) {
      const instanceId = Number(row.process_instance_id);
      const focus = focusByInstance.get(instanceId);
      progress.set(instanceId, {
        totalSteps: Number(row.total_steps ?? 0),
        completedSteps: Number(row.completed_steps ?? 0),
        canceledSteps: Number(row.canceled_steps ?? 0),
        currentStepInstanceId: focus?.stepInstanceId ?? null,
        currentStepName: focus
          ? focus.name ?? `Step ${focus.stepOrder}`
          : null,
      });
    }

    for (const childId of childInstanceIds) {
      if (!progress.has(childId)) {
        progress.set(childId, {
          totalSteps: 0,
          completedSteps: 0,
          canceledSteps: 0,
          currentStepInstanceId: null,
          currentStepName: null,
        });
      }
    }

    return progress;
  }

  private mapChildSummary(
    row: ChildRow,
    parentStepById: Map<
      number,
      {
        stepOrder: number;
        stepName: string;
      }
    >,
    childProgressById: Map<number, ProcessRunnerChildProgress>,
  ): ProcessRunnerChildSummary {
    const parentStep = parentStepById.get(row.parent_step_id);
    const subjectMetadata = parseJsonColumn(row.subject_metadata);
    const processInstanceId = Number(row.process_instance_id);

    return {
      processInstanceId,
      processTemplateId: Number(row.process_template_id),
      parentStepInstanceId: Number(row.parent_step_id),
      parentStepOrder: parentStep?.stepOrder ?? 0,
      parentStepName: parentStep?.stepName ?? `Step ${parentStep?.stepOrder ?? 0}`,
      status: String(row.status),
      subjectType: String(row.subject_type),
      subjectId: Number(row.subject_id),
      subject: {
        type: String(row.subject_type),
        id: Number(row.subject_id),
        metadata: Object.keys(subjectMetadata).length ? subjectMetadata : null,
      },
      correlationId: row.correlation_id ?? null,
      startedAt: toIsoString(row.started_at) ?? new Date(0).toISOString(),
      completedAt: toIsoString(row.completed_at),
      canceledAt: toIsoString(row.canceled_at),
      progress:
        childProgressById.get(processInstanceId) ?? {
          totalSteps: 0,
          completedSteps: 0,
          canceledSteps: 0,
          currentStepInstanceId: null,
          currentStepName: null,
        },
    };
  }

  private mapStep(
    step: StepRow,
    requirements: ProcessRunnerStepRequirement[],
    triggers: ProcessRunnerStepTrigger[],
    objectBindings: ProcessRunnerStepObjectBinding[],
    childRow: ChildRow | undefined,
    requiredPermissions: string[],
    callerCanComplete: boolean,
    assigneeRows: Array<{ tenantUserId: number; assignmentOrder: number }>,
    extensions: ProcessRunnerStepExtensions | null,
    isVisible: boolean,
    canSkip: boolean,
    autoAdvanceEligible: boolean,
    lastFailure: ProcessRunnerStep['lastFailure'] | null,
    lock:
      | {
          lockHolder: number;
          lockExpiresAt: string;
        }
      | null,
  ): ProcessRunnerStep {
    const canComplete =
      callerCanComplete && ['ready', 'in_progress'].includes(step.status);
    const assignees = mapRunnerStepAssignees(assigneeRows);
    const primaryAssigneeId = assignees[0]?.tenantUserId ?? null;

    const mapped: ProcessRunnerStep = {
      stepInstanceId: step.step_instance_id,
      processTemplateStepId: step.process_template_step_id,
      stepOrder: step.step_order,
      name: step.name ?? `Step ${step.step_order}`,
      stepType: step.task_type,
      status: step.status,
      isOptional: Boolean(step.is_optional),
      blockedReason: step.blocked_reason,
      readyAt: toIsoString(step.ready_at),
      startedAt: toIsoString(step.started_at),
      completedAt: toIsoString(step.completed_at),
      canceledAt: toIsoString(step.canceled_at),
      requiredPermissions,
      callerCanComplete,
      canComplete,
      assignees,
      primaryAssigneeId,
      requirements,
      triggers,
      objectBindings,
      isVisible,
      canSkip,
      autoAdvanceEligible,
      lastFailure,
    };

    if (lock) {
      mapped.lockHolder = lock.lockHolder;
      mapped.lockExpiresAt = lock.lockExpiresAt;
    }

    if (extensions) {
      mapped.extensions = extensions;
    }

    if (childRow) {
      mapped.childProcessInstanceId = Number(childRow.process_instance_id);
      mapped.childProcessActive = !['completed', 'canceled'].includes(
        String(childRow.status),
      );
    }

    return mapped;
  }

  private async loadLastFailures(
    stepIds: number[],
  ): Promise<Map<number, ProcessRunnerStep['lastFailure']>> {
    const map = new Map<number, ProcessRunnerStep['lastFailure']>();
    if (!stepIds.length) {
      return map;
    }

    const rows: StepFailureRow[] = await this.dataSource.query(
      `SELECT step_instance_id, occurred_at, metadata
         FROM process_step_execution_log
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
          AND event = 'step_failed'
        ORDER BY occurred_at DESC, log_id DESC`,
      stepIds,
    );

    for (const row of rows) {
      const stepId = Number(row.step_instance_id);
      if (map.has(stepId)) {
        continue;
      }
      const meta = parseJsonColumn(row.metadata);
      map.set(stepId, {
        occurredAt: toIsoString(row.occurred_at) ?? new Date(0).toISOString(),
        ...(typeof meta.errorCode === 'string' ? { errorCode: meta.errorCode } : {}),
        ...(typeof meta.errorDetail === 'string'
          ? { errorDetail: meta.errorDetail }
          : {}),
      });
    }

    return map;
  }
}

function mapRunnerStepAssignees(
  rows: Array<{ tenantUserId: number; assignmentOrder: number }>,
): ProcessRunnerStepAssignee[] {
  return rows.map((row, index) => ({
    tenantUserId: row.tenantUserId,
    assignmentOrder: row.assignmentOrder,
    isPrimary: index === 0,
  }));
}

function groupBy<T extends { stepInstanceId: number }>(
  items: T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const list = map.get(item.stepInstanceId) ?? [];
    list.push(item);
    map.set(item.stepInstanceId, list);
  }
  return map;
}

function stripStepIdFromRequirement(
  row: ProcessRunnerStepRequirement & { stepInstanceId?: number },
): ProcessRunnerStepRequirement {
  const { stepInstanceId: _omit, ...rest } = row as ProcessRunnerStepRequirement & {
    stepInstanceId?: number;
  };
  return rest;
}

function stripStepIdFromTrigger(
  row: ProcessRunnerStepTrigger & { stepInstanceId?: number },
): ProcessRunnerStepTrigger {
  const { stepInstanceId: _omit, ...rest } = row as ProcessRunnerStepTrigger & {
    stepInstanceId?: number;
  };
  return rest;
}

function parseJsonColumn(value: unknown): Record<string, unknown> {
  if (value == null) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function resolveCurrentStepInstanceId(
  steps: ProcessRunnerStep[],
): number | null {
  const visibleSteps = steps.filter(
    (s) => s.isVisible && s.status !== 'skipped',
  );

  const active = visibleSteps.find((s) =>
    ['ready', 'in_progress', 'blocked'].includes(s.status),
  );
  if (active) {
    return active.stepInstanceId;
  }

  const pending = visibleSteps.find((s) => s.status === 'pending');
  if (pending) {
    return pending.stepInstanceId;
  }

  return null;
}

function mapBindingsForExtensionEvaluation(
  bindings: ProcessRunnerStepObjectBinding[],
): ProcessStepExtensionBindingSummary[] {
  return bindings.map((binding) => ({
    objectType: binding.objectType,
    status: binding.status,
    ...(binding.coreId != null ? { coreId: binding.coreId } : {}),
    ...(binding.instanceId != null ? { instanceId: binding.instanceId } : {}),
    ...(binding.resolutionMode
      ? { resolutionMode: binding.resolutionMode }
      : {}),
  }));
}

function parseRunnerStepExtensions(
  value: unknown,
): ProcessRunnerStepExtensions | null {
  const raw = parseJsonColumn(value);
  if (!Object.keys(raw).length) {
    return null;
  }

  const extensions: ProcessRunnerStepExtensions = {};

  if ('visibleWhen' in raw) {
    extensions.visibleWhen =
      raw.visibleWhen == null
        ? null
        : (raw.visibleWhen as Record<string, unknown>);
  }
  if ('autoAdvanceWhen' in raw) {
    extensions.autoAdvanceWhen =
      raw.autoAdvanceWhen == null
        ? null
        : (raw.autoAdvanceWhen as Record<string, unknown>);
  }
  if (typeof raw.allowSkip === 'boolean') {
    extensions.allowSkip = raw.allowSkip;
  }
  if ('parallelGroupId' in raw) {
    extensions.parallelGroupId =
      raw.parallelGroupId == null ? null : String(raw.parallelGroupId);
  }
  if (raw.ui != null && typeof raw.ui === 'object' && !Array.isArray(raw.ui)) {
    const ui = raw.ui as Record<string, unknown>;
    extensions.ui = {
      ...(typeof ui.icon === 'string' ? { icon: ui.icon } : {}),
      ...(typeof ui.color === 'string' ? { color: ui.color } : {}),
      ...(typeof ui.helpText === 'string' ? { helpText: ui.helpText } : {}),
      ...(typeof ui.groupName === 'string' ? { groupName: ui.groupName } : {}),
    };
  }

  return Object.keys(extensions).length ? extensions : null;
}

function resolveStepCanSkip(
  step: StepRow,
  extensions: ProcessRunnerStepExtensions | null,
  callerCanComplete: boolean,
  isVisible: boolean,
  runnerV2Enabled: boolean,
): boolean {
  if (!runnerV2Enabled || !isVisible || !callerCanComplete) {
    return false;
  }

  if (step.status === 'skipped') {
    return false;
  }

  const skipAllowed =
    extensions?.allowSkip === true || Boolean(step.is_optional);
  if (!skipAllowed) {
    return false;
  }

  return ['ready', 'in_progress'].includes(step.status);
}
