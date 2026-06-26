import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { ActionExecutorService } from '../events/platform-actions/action-executor.service';
import type { EventEnvelope } from '../events/types';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepActionEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';
import type {
  EmitEventActionConfig,
  SendNotificationActionConfig,
} from '../events/platform-actions/types/platform-action.types';
import {
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
  type ProcessStepActionRunOn,
  type ProcessStepActionType,
} from './process-step-action.constants';
import {
  buildProcessStepActionEnvelope,
  buildProcessStepActionRuntimeContext,
  resolveOptionalCustomerIdFromRuntime,
  resolvePositiveIntFromPath,
  type ProcessStepActionEnvelopeParams,
} from './process-step-action-envelope.util';
import {
  parseProcessStepActionConfig,
  type CallWebhookActionConfig,
  type GenerateVerificationTokenActionConfig,
  type UpdateSorFieldActionConfig,
} from './process-step-action.types';
import { ProcessStepWebhookClient } from './process-step-webhook.client';
import { ProcessStepActionExecutionLogService } from './process-step-action-execution-log.service';
import { ProcessStepFailureService } from './process-step-failure.service';
import { ProcessStepGenerateVerificationTokenService } from './process-step-generate-verification-token.service';

export interface ProcessStepActionExecutionOptions {
  correlationId?: string | null;
  actorUserId?: number;
}

export interface ProcessStepActionExecutionResult {
  instanceStepActionId: number;
  executionId?: number;
  actionType: ProcessStepActionType;
  status: 'succeeded' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ProcessStepActionBatchResult {
  executed: ProcessStepActionExecutionResult[];
  skipped: boolean;
}

interface LoadedStepContext {
  step: ProcessInstanceStepEntity;
  process: ProcessInstanceEntity;
}

/**
 * Dispatches lifecycle-triggered process step actions (C3+).
 * `emit_event` / `send_notification` delegate to P6; `update_sor_field` and
 * `call_webhook` use ConfigObjectsService and {@link ProcessStepWebhookClient}.
 */
@Injectable()
export class ProcessStepActionExecutorService {
  private readonly logger = new Logger(ProcessStepActionExecutorService.name);

  constructor(
    @InjectRepository(ProcessInstanceStepActionEntity)
    private readonly stepActionRepository: Repository<ProcessInstanceStepActionEntity>,
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly stepRepository: Repository<ProcessInstanceStepEntity>,
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
    private readonly actionExecutor: ActionExecutorService,
    private readonly configObjectsService: ConfigObjectsService,
    private readonly webhookClient: ProcessStepWebhookClient,
    private readonly executionLog: ProcessStepActionExecutionLogService,
    private readonly stepFailure: ProcessStepFailureService,
    private readonly generateVerificationToken: ProcessStepGenerateVerificationTokenService,
  ) {}

  /**
   * Runs active instance actions for a single step and lifecycle hook.
   */
  async executeForStep(
    stepInstanceId: number,
    runOn: ProcessStepActionRunOn,
    options: ProcessStepActionExecutionOptions = {},
  ): Promise<ProcessStepActionBatchResult> {
    const loaded = await this.loadStepContext(stepInstanceId);
    if (!loaded) {
      this.logger.warn(
        `Skipping process step actions — step ${stepInstanceId} not found`,
      );
      return { executed: [], skipped: true };
    }

    const actions = await this.findActiveActionsForStep(stepInstanceId, runOn);
    if (actions.length === 0) {
      return { executed: [], skipped: true };
    }

    const envelopeParams = this.toEnvelopeParams(loaded, runOn, options);
    const executed: ProcessStepActionExecutionResult[] = [];

    for (const action of actions) {
      executed.push(
        await this.executeOne(action, envelopeParams, options),
      );
    }

    return { executed, skipped: false };
  }

  /**
   * Runs `process_completed` actions across all steps in process order.
   */
  async executeForProcessCompleted(
    processInstanceId: number,
    options: ProcessStepActionExecutionOptions = {},
  ): Promise<ProcessStepActionBatchResult> {
    const runOn = PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED;
    const process = await this.processRepository.findOne({
      where: { processInstanceId },
    });
    if (!process) {
      this.logger.warn(
        `Skipping process_completed actions — process ${processInstanceId} not found`,
      );
      return { executed: [], skipped: true };
    }

    const steps = await this.stepRepository.find({
      where: { processInstanceId },
      order: { stepOrder: 'ASC', stepInstanceId: 'ASC' },
    });

    const executed: ProcessStepActionExecutionResult[] = [];
    let anyAction = false;

    for (const step of steps) {
      const actions = await this.findActiveActionsForStep(
        step.stepInstanceId,
        runOn,
      );
      if (actions.length === 0) {
        continue;
      }

      anyAction = true;
      const envelopeParams = this.toEnvelopeParams(
        { step, process },
        runOn,
        options,
      );

      for (const action of actions) {
        executed.push(
          await this.executeOne(action, envelopeParams, options),
        );
      }
    }

    return { executed, skipped: !anyAction };
  }

  private async loadStepContext(
    stepInstanceId: number,
  ): Promise<LoadedStepContext | null> {
    const step = await this.stepRepository.findOne({
      where: { stepInstanceId },
    });
    if (!step) {
      return null;
    }

    const process = await this.processRepository.findOne({
      where: { processInstanceId: step.processInstanceId },
    });
    if (!process) {
      return null;
    }

    return { step, process };
  }

  private async findActiveActionsForStep(
    stepInstanceId: number,
    runOn: ProcessStepActionRunOn,
  ): Promise<ProcessInstanceStepActionEntity[]> {
    return this.stepActionRepository.find({
      where: {
        stepInstanceId,
        runOn,
        isActive: true,
      },
      order: { orderIndex: 'ASC', instanceStepActionId: 'ASC' },
    });
  }

  private toEnvelopeParams(
    loaded: LoadedStepContext,
    runOn: ProcessStepActionRunOn,
    options: ProcessStepActionExecutionOptions,
  ): ProcessStepActionEnvelopeParams {
    const { step, process } = loaded;
    return {
      tenantId: process.tenantId,
      processInstanceId: process.processInstanceId,
      processTemplateId: process.processTemplateId,
      subjectType: process.subjectType,
      subjectId: process.subjectId,
      subjectMetadata: process.subjectMetadata,
      processContext: process.context,
      stepInstanceId: step.stepInstanceId,
      stepName: step.name,
      stepOrder: step.stepOrder,
      stepStatus: step.status,
      runOn,
      correlationId: options.correlationId ?? process.correlationId,
      actorUserId: options.actorUserId,
    };
  }

  private async executeOne(
    action: ProcessInstanceStepActionEntity,
    envelopeParams: ProcessStepActionEnvelopeParams,
    options: ProcessStepActionExecutionOptions,
  ): Promise<ProcessStepActionExecutionResult> {
    const parsed = parseProcessStepActionConfig(
      action.actionType,
      action.config,
    );
    if (!parsed) {
      const message = `Invalid config on instance step action ${action.instanceStepActionId}`;
      this.logger.warn(message);
      return {
        instanceStepActionId: action.instanceStepActionId,
        actionType: action.actionType,
        status: 'failed',
        errorMessage: message,
      };
    }

    const claimed = await this.executionLog.claim({
      instanceStepActionId: action.instanceStepActionId,
      stepInstanceId: envelopeParams.stepInstanceId,
      processInstanceId: envelopeParams.processInstanceId,
      runOn: envelopeParams.runOn,
      actionType: action.actionType,
    });
    if (!claimed) {
      this.logger.debug(
        `Skipping duplicate process step action ${action.instanceStepActionId}`,
      );
      return {
        instanceStepActionId: action.instanceStepActionId,
        actionType: action.actionType,
        status: 'skipped',
        errorMessage: 'Already executed',
      };
    }

    const envelope = buildProcessStepActionEnvelope(envelopeParams);
    const causationId = `process-step-action:${action.instanceStepActionId}`;

    try {
      const result = await this.dispatch(
        action.actionType,
        parsed,
        envelope,
        envelopeParams,
        causationId,
        action.instanceStepActionId,
      );
      await this.executionLog.markSucceeded(claimed.executionId, result);
      this.logger.debug(
        `Process step action ${action.instanceStepActionId} (${action.actionType}) succeeded`,
      );
      return {
        instanceStepActionId: action.instanceStepActionId,
        executionId: claimed.executionId,
        actionType: action.actionType,
        status: 'succeeded',
        result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown execution error';
      await this.executionLog.markFailed(claimed.executionId, message);
      this.logger.error(
        `Process step action ${action.instanceStepActionId} (${action.actionType}) failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      // F6.4: surface action failures as step failures for runner recovery.
      await this.stepFailure.markFailed({
        stepInstanceId: envelopeParams.stepInstanceId,
        processInstanceId: envelopeParams.processInstanceId,
        tenantId: envelopeParams.tenantId,
        stepOrder: envelopeParams.stepOrder ?? 0,
        stepName: envelopeParams.stepName,
        correlationId: envelopeParams.correlationId,
        actorTenantUserId: envelopeParams.actorUserId,
        errorCode: 'step_action_failed',
        errorDetail: message.slice(0, 2048),
      });

      return {
        instanceStepActionId: action.instanceStepActionId,
        executionId: claimed.executionId,
        actionType: action.actionType,
        status: 'failed',
        errorMessage: message.slice(0, 2048),
      };
    }
  }

  private async dispatch(
    actionType: ProcessStepActionType,
    config: ReturnType<typeof parseProcessStepActionConfig>,
    envelope: EventEnvelope,
    envelopeParams: ProcessStepActionEnvelopeParams,
    causationId: string,
    instanceStepActionId: number,
  ): Promise<Record<string, unknown>> {
    if (!config) {
      throw new Error('Missing parsed action config');
    }

    switch (actionType) {
      case PROCESS_STEP_ACTION_TYPE_EMIT_EVENT:
        return this.actionExecutor.executeEmitEventConfig(
          config as EmitEventActionConfig,
          envelope,
          causationId,
        );
      case PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION:
        return this.actionExecutor.executeSendNotificationConfig(
          config as SendNotificationActionConfig,
          envelope,
          `process step action ${instanceStepActionId}`,
        );
      case PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD:
        return this.runUpdateSorField(
          config as UpdateSorFieldActionConfig,
          envelopeParams,
        );
      case PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK:
        return this.runCallWebhook(config as CallWebhookActionConfig, envelopeParams);
      case PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN:
        return this.generateVerificationToken.execute(
          config as GenerateVerificationTokenActionConfig,
          envelopeParams,
        );
      default:
        throw new Error(`Unsupported process step action type: ${actionType}`);
    }
  }

  /**
   * Patches an existing SoR row via {@link ConfigObjectsService.applySorBoundInstancePatch}.
   */
  private async runUpdateSorField(
    config: UpdateSorFieldActionConfig,
    envelopeParams: ProcessStepActionEnvelopeParams,
  ): Promise<Record<string, unknown>> {
    const runtimeContext = buildProcessStepActionRuntimeContext(envelopeParams);
    const coreId = resolvePositiveIntFromPath(
      runtimeContext,
      config.coreIdPath,
    );
    if (coreId == null) {
      throw new Error(
        `coreIdPath "${config.coreIdPath}" did not resolve to a positive integer`,
      );
    }

    const hasCorePatch =
      config.corePatch != null && Object.keys(config.corePatch).length > 0;
    const hasMetaPatch =
      config.metaPatch != null && Object.keys(config.metaPatch).length > 0;
    if (!hasCorePatch && !hasMetaPatch) {
      throw new Error(
        'update_sor_field requires at least one corePatch or metaPatch entry',
      );
    }

    const objectType = config.objectType.trim();
    const customerId =
      objectType !== 'customer' && objectType.startsWith('customer_')
        ? resolveOptionalCustomerIdFromRuntime(runtimeContext)
        : undefined;

    const patchResult =
      await this.configObjectsService.applySorBoundInstancePatch({
        tenantId: envelopeParams.tenantId,
        objectType,
        coreId,
        corePatch: config.corePatch,
        metaPatch: config.metaPatch,
        customerId,
      });

    return {
      objectType,
      coreId,
      metaJson: patchResult.metaJson,
    };
  }

  /**
   * POST/PUT/PATCH/DELETE/GET outbound HTTP for external integrations.
   */
  private async runCallWebhook(
    config: CallWebhookActionConfig,
    envelopeParams: ProcessStepActionEnvelopeParams,
  ): Promise<Record<string, unknown>> {
    const runtimeContext = buildProcessStepActionRuntimeContext(envelopeParams);
    const payload = {
      tenantId: envelopeParams.tenantId,
      processInstanceId: envelopeParams.processInstanceId,
      stepInstanceId: envelopeParams.stepInstanceId,
      runOn: envelopeParams.runOn,
      correlationId: envelopeParams.correlationId ?? null,
      runtime: runtimeContext,
      ...(config.body ?? {}),
    };

    const result = await this.webhookClient.invoke({
      url: config.url,
      method: config.method ?? 'POST',
      headers: config.headers,
      body: payload,
      timeoutMs: config.timeoutMs,
      tenantId: envelopeParams.tenantId,
      correlationId: envelopeParams.correlationId,
    });

    return {
      url: result.url,
      method: result.method,
      statusCode: result.statusCode,
      responseBodyPreview: result.responseBodyPreview,
    };
  }
}
