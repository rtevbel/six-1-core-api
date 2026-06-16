import { Injectable, Logger } from '@nestjs/common';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
} from './process-step-action.constants';
import {
  ProcessStepActionExecutorService,
  type ProcessStepActionExecutionOptions,
} from './process-step-action-executor.service';

/**
 * Post-commit hooks from {@link StepOrchestratorService} into process-step actions (C8).
 * Failures are logged and swallowed so lifecycle commits are never rolled back.
 */
@Injectable()
export class ProcessStepActionOrchestrationService {
  private readonly logger = new Logger(ProcessStepActionOrchestrationService.name);

  constructor(
    private readonly flags: ProcessFeatureFlagsService,
    private readonly executor: ProcessStepActionExecutorService,
  ) {}

  async runStepCompleted(
    stepInstanceId: number,
    options: ProcessStepActionExecutionOptions = {},
  ): Promise<void> {
    if (!this.flags.isStepActionsEnabled()) {
      return;
    }

    try {
      await this.executor.executeForStep(
        stepInstanceId,
        PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
        options,
      );
    } catch (error) {
      this.logger.error(
        `step_completed actions failed for step ${stepInstanceId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async runStepFailed(
    stepInstanceId: number,
    options: ProcessStepActionExecutionOptions = {},
  ): Promise<void> {
    if (!this.flags.isStepActionsEnabled()) {
      return;
    }

    try {
      await this.executor.executeForStep(
        stepInstanceId,
        PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
        options,
      );
    } catch (error) {
      this.logger.error(
        `step_failed actions failed for step ${stepInstanceId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async runProcessCompleted(
    processInstanceId: number,
    options: ProcessStepActionExecutionOptions = {},
  ): Promise<void> {
    if (!this.flags.isStepActionsEnabled()) {
      return;
    }

    try {
      await this.executor.executeForProcessCompleted(processInstanceId, options);
    } catch (error) {
      this.logger.error(
        `process_completed actions failed for process ${processInstanceId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
