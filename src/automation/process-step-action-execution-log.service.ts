import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import type {
  ProcessStepActionRunOn,
  ProcessStepActionType,
} from './process-step-action.constants';
import { ProcessActionExecutionLogEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';

export interface ClaimProcessStepActionExecutionParams {
  instanceStepActionId: number;
  stepInstanceId: number;
  processInstanceId: number;
  runOn: ProcessStepActionRunOn;
  actionType: ProcessStepActionType;
}

/**
 * Idempotency + audit log for process-step lifecycle actions (C7).
 * Mirrors {@link ActionExecutorService} claim pattern on `action_execution_log`.
 */
@Injectable()
export class ProcessStepActionExecutionLogService {
  private readonly logger = new Logger(ProcessStepActionExecutionLogService.name);

  constructor(
    @InjectRepository(ProcessActionExecutionLogEntity)
    private readonly executionLogRepository: Repository<ProcessActionExecutionLogEntity>,
  ) {}

  /**
   * Claims an execution slot for an instance action. Returns null when already claimed.
   */
  async claim(
    params: ClaimProcessStepActionExecutionParams,
  ): Promise<ProcessActionExecutionLogEntity | null> {
    const existing = await this.executionLogRepository.findOne({
      where: { instanceStepActionId: params.instanceStepActionId },
    });
    if (existing) {
      return null;
    }

    try {
      return await this.executionLogRepository.save(
        this.executionLogRepository.create({
          instanceStepActionId: params.instanceStepActionId,
          stepInstanceId: params.stepInstanceId,
          processInstanceId: params.processInstanceId,
          runOn: params.runOn,
          actionType: params.actionType,
          status: 'pending',
        }),
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  }

  async markSucceeded(
    executionId: number,
    result: Record<string, unknown>,
  ): Promise<void> {
    await this.executionLogRepository.update(
      executionId,
      {
        status: 'succeeded',
        result,
        errorMessage: null,
      } as QueryDeepPartialEntity<ProcessActionExecutionLogEntity>,
    );
  }

  async markFailed(executionId: number, errorMessage: string): Promise<void> {
    await this.executionLogRepository.update(executionId, {
      status: 'failed',
      errorMessage: errorMessage.slice(0, 2048),
    });
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string };
    return driverError?.code === 'ER_DUP_ENTRY' || driverError?.code === '23505';
  }
}
