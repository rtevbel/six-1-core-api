import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ProcessInstanceStepEntity } from './process_instance_steps/entities/process_instance_step.entity';
import { ProcessActionExecutionLogEntity } from './process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';
import { ProcessStepExecutionLogEntity } from './entities/process_step_execution_log.entity';
import { PlatformEventRecordEntity } from '../events/platform-bus/entities/platform_event_record.entity';
import type { ProcessStepExecutionEvent } from './process-step-execution-log.constants';
import { NO_RECORD_FOUND_MESSAGE } from '../common/constants';
import type { GetProcessInstanceTimelineDto } from './dto/get-process-instance-timeline.dto';
import type {
  ProcessInstanceTimelineEntry,
  ProcessInstanceTimelineResult,
  ProcessLifecycleTimelineEntry,
  StepLifecycleTimelineEntry,
} from './interfaces/process-instance-timeline.interface';

const DEFAULT_TIMELINE_LIMIT = 200;
const PROCESS_EVENT_PREFIX = 'six1-event.process';

@Injectable()
export class ProcessInstanceTimelineService {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly stepRepository: Repository<ProcessInstanceStepEntity>,
    @InjectRepository(ProcessActionExecutionLogEntity)
    private readonly actionLogRepository: Repository<ProcessActionExecutionLogEntity>,
    @InjectRepository(ProcessStepExecutionLogEntity)
    private readonly stepExecutionLogRepository: Repository<ProcessStepExecutionLogEntity>,
    @InjectRepository(PlatformEventRecordEntity)
    private readonly platformEventRepository: Repository<PlatformEventRecordEntity>,
  ) {}

  async getTimeline(
    _userId: number,
    dto: GetProcessInstanceTimelineDto,
  ): Promise<ProcessInstanceTimelineResult> {
    const limit = Math.min(dto.limit ?? DEFAULT_TIMELINE_LIMIT, 500);

    const instance = await this.processRepository.findOne({
      where:
        dto.tenantId != null
          ? { processInstanceId: dto.processInstanceId, tenantId: dto.tenantId }
          : { processInstanceId: dto.processInstanceId },
    });

    if (!instance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessInstance'),
      );
    }

    const [steps, stepExecutionLogs, actionLogs, platformEvents] = await Promise.all([
      this.stepRepository.find({
        where: { processInstanceId: instance.processInstanceId },
        order: { stepOrder: 'ASC', stepInstanceId: 'ASC' },
      }),
      this.stepExecutionLogRepository.find({
        where: { processInstanceId: instance.processInstanceId },
        order: { occurredAt: 'ASC', logId: 'ASC' },
        take: limit,
      }),
      this.actionLogRepository.find({
        where: { processInstanceId: instance.processInstanceId },
        order: { createdAt: 'ASC', executionId: 'ASC' },
        take: limit,
      }),
      this.loadPlatformEvents(instance, limit),
    ]);

    const processEntries = this.buildProcessLifecycleEntries(instance);
    const stepEntries =
      stepExecutionLogs.length > 0
        ? this.buildStepLifecycleEntriesFromLog(stepExecutionLogs)
        : steps.flatMap((step) => this.buildStepLifecycleEntries(step));
    const actionEntries = actionLogs.map((log) => ({
      kind: 'step_action' as const,
      occurredAt: log.createdAt.toISOString(),
      executionId: log.executionId,
      stepInstanceId: log.stepInstanceId,
      instanceStepActionId: log.instanceStepActionId,
      runOn: log.runOn,
      actionType: log.actionType,
      status: log.status,
      result: log.result ?? null,
      errorMessage: log.errorMessage ?? null,
    }));
    const platformEntries = platformEvents.map((record) => ({
      kind: 'platform_event' as const,
      occurredAt: record.occurredAt.toISOString(),
      recordId: record.recordId,
      eventName: record.eventName,
      correlationId: record.correlationId,
      causationId: record.causationId,
      status: record.status,
    }));

    const entries = this.sortEntries([
      ...processEntries,
      ...stepEntries,
      ...actionEntries,
      ...platformEntries,
    ]).slice(0, limit);

    return {
      processInstanceId: instance.processInstanceId,
      processTemplateId: instance.processTemplateId,
      tenantId: instance.tenantId,
      status: instance.status,
      correlationId: instance.correlationId,
      entries,
      summary: {
        processLifecycleCount: processEntries.length,
        stepLifecycleCount: stepEntries.length,
        stepActionCount: actionEntries.length,
        platformEventCount: platformEntries.length,
      },
    };
  }

  private async loadPlatformEvents(
    instance: ProcessInstanceEntity,
    limit: number,
  ): Promise<PlatformEventRecordEntity[]> {
    const qb = this.platformEventRepository
      .createQueryBuilder('record')
      .where('record.eventName LIKE :processPrefix', {
        processPrefix: `${PROCESS_EVENT_PREFIX}%`,
      })
      .orderBy('record.occurredAt', 'ASC')
      .addOrderBy('record.recordId', 'ASC')
      .take(limit);

    qb.andWhere(
      `(
        (record.entityType = :entityType AND record.entityId = :processInstanceId)
        OR (
          record.correlationId IS NOT NULL
          AND :correlationId IS NOT NULL
          AND record.correlationId = :correlationId
        )
        OR JSON_UNQUOTE(JSON_EXTRACT(record.payload, '$.processInstanceId')) = :processInstanceIdText
        OR JSON_UNQUOTE(JSON_EXTRACT(record.payload, '$.refs.processInstanceId')) = :processInstanceIdText
      )`,
      {
        entityType: 'process_instances',
        processInstanceId: instance.processInstanceId,
        correlationId: instance.correlationId,
        processInstanceIdText: String(instance.processInstanceId),
      },
    );

    if (instance.tenantId > 0) {
      qb.andWhere('(record.tenantId IS NULL OR record.tenantId = :tenantId)', {
        tenantId: instance.tenantId,
      });
    }

    return qb.getMany();
  }

  private buildProcessLifecycleEntries(
    instance: ProcessInstanceEntity,
  ): ProcessLifecycleTimelineEntry[] {
    const entries: ProcessLifecycleTimelineEntry[] = [];

    entries.push({
      kind: 'process_started',
      occurredAt: instance.startedAt.toISOString(),
      status: instance.status,
    });

    if (instance.completedAt) {
      entries.push({
        kind: 'process_completed',
        occurredAt: instance.completedAt.toISOString(),
        status: 'completed',
      });
    }

    if (instance.canceledAt) {
      entries.push({
        kind: 'process_canceled',
        occurredAt: instance.canceledAt.toISOString(),
        status: 'canceled',
      });
    }

    return entries;
  }

  private buildStepLifecycleEntries(
    step: ProcessInstanceStepEntity,
  ): StepLifecycleTimelineEntry[] {
    const entries: StepLifecycleTimelineEntry[] = [];
    const base = {
      stepInstanceId: step.stepInstanceId,
      stepOrder: step.stepOrder,
      stepName: step.name ?? `Step ${step.stepOrder}`,
      status: step.status,
    };

    if (step.readyAt) {
      entries.push({
        kind: 'step_ready',
        occurredAt: step.readyAt.toISOString(),
        ...base,
      });
    }

    if (step.startedAt) {
      entries.push({
        kind: 'step_started',
        occurredAt: step.startedAt.toISOString(),
        ...base,
      });
    }

    if (step.completedAt) {
      entries.push({
        kind: 'step_completed',
        occurredAt: step.completedAt.toISOString(),
        ...base,
      });
    }

    if (step.canceledAt) {
      entries.push({
        kind: 'step_canceled',
        occurredAt: step.canceledAt.toISOString(),
        ...base,
      });
    }

    return entries;
  }

  private buildStepLifecycleEntriesFromLog(
    logs: ProcessStepExecutionLogEntity[],
  ): StepLifecycleTimelineEntry[] {
    return logs.map((log) => ({
      kind: log.event as ProcessStepExecutionEvent,
      occurredAt: log.occurredAt.toISOString(),
      stepInstanceId: log.stepInstanceId,
      stepOrder: log.stepOrder,
      stepName: log.stepName ?? `Step ${log.stepOrder}`,
      status: log.newStatus,
      actorTenantUserId: log.actorTenantUserId ?? null,
      cause: log.cause ?? null,
      logId: log.logId,
    }));
  }

  private sortEntries(
    entries: ProcessInstanceTimelineEntry[],
  ): ProcessInstanceTimelineEntry[] {
    return [...entries].sort((left, right) => {
      const delta =
        new Date(left.occurredAt).getTime() -
        new Date(right.occurredAt).getTime();
      if (delta !== 0) {
        return delta;
      }
      return left.kind.localeCompare(right.kind);
    });
  }
}
