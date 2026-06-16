import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { QueryRunner, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { NO_RECORD_FOUND_MESSAGE } from '../common/constants';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessStepExecutionLogEntity } from '../process_instances/entities/process_step_execution_log.entity';
import type { GetProcessInstanceStepExecutionLogDto } from '../process_instances/dto/get-process-instance-step-execution-log.dto';
import type {
  ProcessStepExecutionLogEntry,
  ProcessStepExecutionLogResult,
} from '../process_instances/interfaces/process-step-execution-log.interface';
import {
  mapEngineStateToExecutionEvent,
  type ProcessStepExecutionEvent,
  type ProcessStepExecutionCause,
} from '../process_instances/process-step-execution-log.constants';

const DEFAULT_LOG_LIMIT = 200;

export type RecordProcessStepTransitionParams = {
  processInstanceId: number;
  stepInstanceId: number;
  tenantId: number;
  stepOrder: number;
  stepName?: string | null;
  previousStatus: string;
  newStatus: string;
  cause?: ProcessStepExecutionCause;
  actorTenantUserId?: number;
  correlationId?: string;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
};

/**
 * Append-only audit log for process step lifecycle transitions (E2).
 */
@Injectable()
export class ProcessStepExecutionLogService {
  constructor(
    @InjectRepository(ProcessStepExecutionLogEntity)
    private readonly logRepository: Repository<ProcessStepExecutionLogEntity>,
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
  ) {}

  async recordTransition(
    qr: QueryRunner,
    params: RecordProcessStepTransitionParams,
  ): Promise<void> {
    const event = mapEngineStateToExecutionEvent(params.newStatus);
    if (!event) {
      return;
    }

    const occurredAt = params.occurredAt ?? new Date();
    await qr.manager.insert(ProcessStepExecutionLogEntity, {
      processInstanceId: params.processInstanceId,
      stepInstanceId: params.stepInstanceId,
      tenantId: params.tenantId,
      stepOrder: params.stepOrder,
      stepName: params.stepName ?? null,
      event,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      cause: params.cause ?? 'system',
      actorTenantUserId: params.actorTenantUserId ?? null,
      correlationId: params.correlationId ?? null,
      metadata: params.metadata ?? null,
      occurredAt,
    } as QueryDeepPartialEntity<ProcessStepExecutionLogEntity>);
  }

  async recordCustomEvent(
    qr: QueryRunner,
    params: RecordProcessStepTransitionParams & { event: ProcessStepExecutionEvent },
  ): Promise<void> {
    const occurredAt = params.occurredAt ?? new Date();
    await qr.manager.insert(ProcessStepExecutionLogEntity, {
      processInstanceId: params.processInstanceId,
      stepInstanceId: params.stepInstanceId,
      tenantId: params.tenantId,
      stepOrder: params.stepOrder,
      stepName: params.stepName ?? null,
      event: params.event,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      cause: params.cause ?? 'system',
      actorTenantUserId: params.actorTenantUserId ?? null,
      correlationId: params.correlationId ?? null,
      metadata: params.metadata ?? null,
      occurredAt,
    } as QueryDeepPartialEntity<ProcessStepExecutionLogEntity>);
  }

  async getExecutionLog(
    _userId: number,
    dto: GetProcessInstanceStepExecutionLogDto,
  ): Promise<ProcessStepExecutionLogResult> {
    const limit = Math.min(dto.limit ?? DEFAULT_LOG_LIMIT, 500);
    const offset = dto.offset ?? 0;

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

    const qb = this.logRepository
      .createQueryBuilder('log')
      .where('log.processInstanceId = :processInstanceId', {
        processInstanceId: instance.processInstanceId,
      })
      .orderBy('log.occurredAt', 'ASC')
      .addOrderBy('log.logId', 'ASC');

    if (dto.stepInstanceId != null) {
      qb.andWhere('log.stepInstanceId = :stepInstanceId', {
        stepInstanceId: dto.stepInstanceId,
      });
    }

    const [rows, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      processInstanceId: instance.processInstanceId,
      tenantId: instance.tenantId,
      total,
      entries: rows.map((row) => this.toEntry(row)),
    };
  }

  private toEntry(row: ProcessStepExecutionLogEntity): ProcessStepExecutionLogEntry {
    return {
      logId: row.logId,
      processInstanceId: row.processInstanceId,
      stepInstanceId: row.stepInstanceId,
      tenantId: row.tenantId,
      stepOrder: row.stepOrder,
      stepName: row.stepName ?? null,
      event: row.event,
      previousStatus: row.previousStatus ?? null,
      newStatus: row.newStatus,
      cause: row.cause ?? null,
      actorTenantUserId: row.actorTenantUserId ?? null,
      correlationId: row.correlationId ?? null,
      metadata: row.metadata ?? null,
      occurredAt: row.occurredAt.toISOString(),
    };
  }
}
