import { Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, EntityManager } from 'typeorm';
import { EventsService } from '../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import { buildProcessInstanceEventOptions } from '../events/platform-process-event.util';
import { resolveCorrelationId } from '../events/platform-correlation.util';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessInstantiationService } from './process-instantiation.service';
import { SCHEDULER_PORT, type SchedulerPort } from './scheduler.port';
import type { ProjectHostStartData } from './process-host/project-host.adapter';
import type {
  ProcessHostContext,
  StartProcessParams,
  StartProcessResult,
} from './process-host/process-host.context';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import {
  PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
  PROCESS_SUBJECT_TYPE_SOR_ENTITY,
} from './process-subject.constants';
import { isProcessSubjectType } from './process-subject.constants';
import type { ProcessInstanceSubjectInput } from './process-subject.types';
import { ProcessCompletionService } from './process-completion.service';
import type { ProcessCompletionCheck } from './process-completion.service';

export interface StartProcessForProjectParams {
  tenantId: number;
  createdBy: number;
  templateId: number;
  projectId: number;
  statusIdByName: Record<string, number>;
  entityManager: EntityManager;
}

export interface StartProcessForSorEntityParams {
  tenantId: number;
  createdBy: number;
  templateId: number;
  objectType: string;
  coreId: number;
  context?: Record<string, unknown> | null;
  correlationId?: string | null;
  subjectMetadata?: Record<string, unknown> | null;
  entityManager?: EntityManager;
}

export interface StartWorkflowProcessParams {
  tenantId: number;
  createdBy: number;
  templateId: number;
  context?: Record<string, unknown> | null;
  correlationId?: string | null;
  subjectMetadata?: Record<string, unknown> | null;
  entityManager?: EntityManager;
}

export interface StartProcessForScheduledTaskParams {
  tenantId: number;
  createdBy: number;
  templateId: number;
  scheduledTaskId: number;
  context?: Record<string, unknown> | null;
  correlationId?: string | null;
  subjectMetadata?: Record<string, unknown> | null;
  entityManager?: EntityManager;
}

@Injectable()
export class ProcessLifecycleFacade {
  private readonly logger = new Logger(ProcessLifecycleFacade.name);

  constructor(
    private readonly ds: DataSource,
    private readonly instantiation: ProcessInstantiationService,
    private readonly hostRegistry: ProcessHostRegistry,
    private readonly events: EventsService,
    private readonly processFlags: ProcessFeatureFlagsService,
    private readonly processCompletion: ProcessCompletionService,
    @Inject(SCHEDULER_PORT) private readonly scheduler: SchedulerPort,
  ) {}

  /**
   * Returns whether a process instance satisfies engine completion rules (plan §7).
   */
  async canCompleteProcess(
    processInstanceId: number,
    entityManager?: EntityManager,
  ): Promise<boolean> {
    return this.processCompletion.canCompleteProcess(
      processInstanceId,
      entityManager,
    );
  }

  /**
   * Detailed completion evaluation (steps, children, object bindings).
   */
  async evaluateProcessCompletion(
    processInstanceId: number,
    entityManager?: EntityManager,
  ): Promise<ProcessCompletionCheck> {
    return this.processCompletion.evaluate(processInstanceId, entityManager);
  }

  /**
   * Starts a process for an arbitrary subject inside or outside a caller transaction.
   */
  async startProcess(params: StartProcessParams): Promise<StartProcessResult> {
    if (!isProcessSubjectType(params.subjectType)) {
      throw new RpcException(`Unsupported subject_type: ${params.subjectType}`);
    }

    if (!this.hostRegistry.has(params.subjectType)) {
      throw new RpcException(
        `No host adapter for subject_type: ${params.subjectType}`,
      );
    }

    this.assertSubjectTierEnabled(params.subjectType);

    const run = (em: EntityManager) => this.startProcessInTransaction(em, params);

    if (params.entityManager) {
      return run(params.entityManager);
    }

    return this.ds.transaction('READ COMMITTED', run);
  }

  async batchStartProcess(params: {
    tenantId: number;
    createdBy: number;
    templateId: number;
    async: boolean;
    items: Array<{
      itemIndex: number;
      subjectType: string;
      subjectId: number;
      subjectMetadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
      correlationId: string | null;
    }>;
  }): Promise<
    | { status: 'queued'; requested: number; deduped: number }
    | {
        status: 'started';
        requested: number;
        deduped: number;
        results: Array<StartProcessResult & { itemIndex: number }>;
      }
  > {
    const requested = params.items.length;
    const dedupedItems = dedupeBatchStartItems(params.items);
    const deduped = dedupedItems.length;

    const ASYNC_THRESHOLD = 50;
    if (params.async || dedupedItems.length > ASYNC_THRESHOLD) {
      await this.scheduler.schedule(0, 'batch-start-process', {
        tenantId: params.tenantId,
        createdBy: params.createdBy,
        templateId: params.templateId,
        items: dedupedItems,
      });
      return { status: 'queued', requested, deduped };
    }

    const results = await this.ds.transaction('READ COMMITTED', async (em) => {
      const out: Array<StartProcessResult & { itemIndex: number }> = [];
      for (const item of dedupedItems) {
        const started = await this.startProcess({
          tenantId: params.tenantId,
          createdBy: params.createdBy,
          templateId: params.templateId,
          subjectType: item.subjectType,
          subjectId: item.subjectId,
          subjectMetadata: item.subjectMetadata,
          context: item.context,
          correlationId: item.correlationId,
          entityManager: em,
        });
        out.push({ ...started, itemIndex: item.itemIndex });
      }
      return out;
    });

    return { status: 'started', requested, deduped, results };
  }

  /**
   * Project create helper — seeds mappings and process-controlled tasks.
   */
  async startProcessForProject(
    params: StartProcessForProjectParams,
  ): Promise<StartProcessResult> {
    const hostData: ProjectHostStartData = {
      projectId: params.projectId,
      statusIdByName: params.statusIdByName,
    };

    return this.startProcess({
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      templateId: params.templateId,
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: params.projectId,
      entityManager: params.entityManager,
      hostData: hostData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Tier 1 pilot — scheduled task job anchor (no kanban task seeding).
   */
  async startProcessForScheduledTask(
    params: StartProcessForScheduledTaskParams,
  ): Promise<StartProcessResult> {
    return this.startProcess({
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      templateId: params.templateId,
      subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
      subjectId: params.scheduledTaskId,
      context: params.context,
      correlationId: params.correlationId,
      subjectMetadata: params.subjectMetadata,
      entityManager: params.entityManager,
    });
  }

  /**
   * Tier 3 entry — workflow subject (self-subject id applied during instantiation).
   */
  async startWorkflowProcess(
    params: StartWorkflowProcessParams,
  ): Promise<StartProcessResult> {
    return this.startProcess({
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      templateId: params.templateId,
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      context: params.context,
      correlationId: params.correlationId,
      subjectMetadata: params.subjectMetadata,
      entityManager: params.entityManager,
    });
  }

  /**
   * Tier 4 — process anchored on an existing SoR / system_table row.
   */
  async startProcessForSorEntity(
    params: StartProcessForSorEntityParams,
  ): Promise<StartProcessResult> {
    const subjectMetadata = {
      objectType: params.objectType,
      coreId: params.coreId,
      ...(params.subjectMetadata ?? {}),
    };

    return this.startProcess({
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      templateId: params.templateId,
      subjectType: PROCESS_SUBJECT_TYPE_SOR_ENTITY,
      subjectId: params.coreId,
      context: params.context,
      correlationId: params.correlationId,
      subjectMetadata,
      entityManager: params.entityManager,
    });
  }

  private async startProcessInTransaction(
    em: EntityManager,
    params: StartProcessParams,
  ): Promise<StartProcessResult> {
    const subject: ProcessInstanceSubjectInput = {
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      subjectMetadata: params.subjectMetadata ?? null,
    };

    const correlationId = resolveCorrelationId(params.correlationId);

    const processInstanceId = await this.instantiation.instantiateProcessIn(
      em,
      params.templateId,
      params.tenantId,
      params.createdBy,
      {
        subject,
        parentInstanceId: params.parentInstanceId ?? null,
        parentStepId: params.parentStepId ?? null,
        onChildFailure: params.onChildFailure ?? 'pause_parent',
        context: params.context ?? null,
      },
    );

    await em.query(
      `UPDATE process_instances SET correlation_id = ? WHERE process_instance_id = ?`,
      [correlationId, processInstanceId],
    );

    const adapter = this.hostRegistry.get(params.subjectType);
    const hostCtx: ProcessHostContext = {
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      processInstanceId,
      templateId: params.templateId,
      subjectType: params.subjectType,
      subjectId:
        params.subjectType === PROCESS_SUBJECT_TYPE_WORKFLOW
          ? processInstanceId
          : params.subjectId,
      subjectMetadata: params.subjectMetadata ?? null,
      correlationId,
      context: params.context ?? null,
      entityManager: em,
      hostData: params.hostData,
    };

    if (!params.skipHostOnStart) {
      await adapter.onProcessStarted(hostCtx);
    }

    const firstStepInstanceId = await this.resolveFirstStepInstanceId(
      em,
      processInstanceId,
    );

    if (this.processFlags.isSubjectModelEnabled()) {
      this.events.emit(
        PLATFORM_EVENT_NAMES.PROCESS_STARTED,
        buildProcessInstanceEventOptions({
          tenantId: params.tenantId,
          processInstanceId,
          processTemplateId: params.templateId,
          correlationId,
          subjectType: params.subjectType,
          subjectId: hostCtx.subjectId,
        }),
      );
    }

    this.logger.debug(
      `Started process ${processInstanceId} subject=${params.subjectType}:${hostCtx.subjectId}`,
    );

    return { processInstanceId, firstStepInstanceId, correlationId };
  }

  private async resolveFirstStepInstanceId(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<number | null> {
    const rows: Array<{ step_instance_id: number }> = await em.query(
      `SELECT step_instance_id
         FROM process_instance_steps
        WHERE process_instance_id = ?
        ORDER BY step_order ASC
        LIMIT 1`,
      [processInstanceId],
    );
    return rows[0]?.step_instance_id ?? null;
  }

  /**
   * Tier 2/3 starts are feature-flagged; Tier 1 project start always writes subject_* post-migration.
   */
  private assertSubjectTierEnabled(subjectType: string): void {
    if (
      subjectType === PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE &&
      !this.processFlags.isTier2InstanceSubjectEnabled()
    ) {
      throw new RpcException(
        'Standalone instance process subjects are disabled (PROCESS_TIER2_INSTANCE_SUBJECT_ENABLED)',
      );
    }

    if (
      subjectType === PROCESS_SUBJECT_TYPE_WORKFLOW &&
      !this.processFlags.isTier3WorkflowSubjectEnabled()
    ) {
      throw new RpcException(
        'Workflow process subjects are disabled (PROCESS_TIER3_WORKFLOW_SUBJECT_ENABLED)',
      );
    }

    if (
      subjectType === PROCESS_SUBJECT_TYPE_SCHEDULED_TASK &&
      !this.processFlags.isTier1ScheduledTaskEnabled()
    ) {
      throw new RpcException(
        'Scheduled task process subjects are disabled (PROCESS_TIER1_SCHEDULED_TASK_ENABLED)',
      );
    }

    if (
      subjectType === PROCESS_SUBJECT_TYPE_SOR_ENTITY &&
      !this.processFlags.isTier4SorEntityEnabled()
    ) {
      throw new RpcException(
        'SOR entity process subjects are disabled (PROCESS_TIER4_SOR_ENTITY_ENABLED)',
      );
    }
  }
}

function dedupeBatchStartItems<T extends { itemIndex: number }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = stableStringify({
      subjectType: (item as any).subjectType,
      subjectId: (item as any).subjectId,
      subjectMetadata: (item as any).subjectMetadata,
      context: (item as any).context,
    });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

function stableStringify(value: unknown): string {
  if (value == null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}
