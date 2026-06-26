import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { ActionExecutorService } from '../events/platform-actions/action-executor.service';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepActionEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
  PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
} from './process-step-action.constants';
import { ProcessStepActionExecutionLogService } from './process-step-action-execution-log.service';
import { ProcessStepActionExecutorService } from './process-step-action-executor.service';
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { ProcessStepWebhookClient } from './process-step-webhook.client';
import { ProcessStepFailureService } from './process-step-failure.service';
import { ProcessStepGenerateVerificationTokenService } from './process-step-generate-verification-token.service';
import * as tokenUtil from '../config_objects/verification/generate-verification-token.util';

/**
 * C11 — Integration coverage for process step actions.
 * Real {@link ProcessStepActionExecutorService} + {@link ProcessStepActionOrchestrationService};
 * repositories, P6, SoR patch, webhook, and execution log I/O are mocked.
 */
describe('Process step actions (integration — C11)', () => {
  let orchestration: ProcessStepActionOrchestrationService;
  let actionExecutor: {
    executeEmitEventConfig: jest.Mock;
    executeSendNotificationConfig: jest.Mock;
  };
  let configObjectsService: {
    getObjectSchema: jest.Mock;
    applySorBoundInstancePatch: jest.Mock;
  };
  let webhookClient: { invoke: jest.Mock };
  let executionLog: {
    claim: jest.Mock;
    markSucceeded: jest.Mock;
    markFailed: jest.Mock;
  };
  let stepFailure: { markFailed: jest.Mock };
  let stepActionRepo: { find: jest.Mock };
  let stepRepo: { findOne: jest.Mock; find: jest.Mock };
  let processRepo: { findOne: jest.Mock };
  let flags: { isStepActionsEnabled: jest.Mock };

  const processRow = {
    processInstanceId: 100,
    processTemplateId: 10,
    tenantId: 5,
    subjectType: 'project',
    subjectId: 50,
    subjectMetadata: null,
    context: { customerId: 42 },
    correlationId: 'corr-onboarding',
  } as ProcessInstanceEntity;

  const finalStep = {
    stepInstanceId: 201,
    processInstanceId: 100,
    name: 'Finalize onboarding',
    stepOrder: 2,
    status: 'completed',
  } as ProcessInstanceStepEntity;

  const priorStep = {
    stepInstanceId: 200,
    processInstanceId: 100,
    name: 'Collect details',
    stepOrder: 1,
    status: 'completed',
  } as ProcessInstanceStepEntity;

  beforeEach(async () => {
    actionExecutor = {
      executeEmitEventConfig: jest
        .fn()
        .mockResolvedValue({ eventName: 'six1-event.process_completed' }),
      executeSendNotificationConfig: jest
        .fn()
        .mockResolvedValue({ notificationIds: [88] }),
    };
    configObjectsService = {
      getObjectSchema: jest.fn().mockResolvedValue({
        configObject: {
          bindingMode: 'sor_bound',
          verificationFieldMap: {
            tokenField: 'verification_token',
            expiresAtField: 'token_expires_at',
            verifiedField: 'email_verified',
            defaultTtlHours: 24,
          },
        },
      }),
      applySorBoundInstancePatch: jest.fn().mockResolvedValue({
        core: { customerId: 42, status: 'active' },
        metaJson: {
          verification_token: 'fixed-token',
          token_expires_at: '2026-06-27T12:00:00.000Z',
          email_verified: false,
        },
      }),
    };
    webhookClient = {
      invoke: jest.fn().mockResolvedValue({
        url: 'https://hooks.example.com/fail',
        method: 'POST',
        statusCode: 200,
        ok: true,
        responseBodyPreview: '{"ok":true}',
      }),
    };
    executionLog = {
      claim: jest.fn().mockResolvedValue({ executionId: 9001 }),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    stepFailure = { markFailed: jest.fn().mockResolvedValue(undefined) };
    stepActionRepo = { find: jest.fn() };
    stepRepo = { findOne: jest.fn(), find: jest.fn() };
    processRepo = { findOne: jest.fn() };
    flags = { isStepActionsEnabled: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepActionExecutorService,
        ProcessStepActionOrchestrationService,
        ProcessStepGenerateVerificationTokenService,
        { provide: ProcessFeatureFlagsService, useValue: flags },
        { provide: ActionExecutorService, useValue: actionExecutor },
        { provide: ConfigObjectsService, useValue: configObjectsService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'https://app.example.com'),
          },
        },
        { provide: ProcessStepWebhookClient, useValue: webhookClient },
        { provide: ProcessStepActionExecutionLogService, useValue: executionLog },
        { provide: ProcessStepFailureService, useValue: stepFailure },
        {
          provide: getRepositoryToken(ProcessInstanceStepActionEntity),
          useValue: stepActionRepo,
        },
        {
          provide: getRepositoryToken(ProcessInstanceStepEntity),
          useValue: stepRepo,
        },
        {
          provide: getRepositoryToken(ProcessInstanceEntity),
          useValue: processRepo,
        },
      ],
    }).compile();

    orchestration = module.get(ProcessStepActionOrchestrationService);
    jest
      .spyOn(tokenUtil, 'generateVerificationToken')
      .mockReturnValue('fixed-token');
    jest.useFakeTimers().setSystemTime(new Date('2026-06-26T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function mockProcessCompletedCustomerWriteBack(): void {
    configObjectsService.applySorBoundInstancePatch.mockResolvedValue({
      core: { customerId: 42, status: 'active' },
      metaJson: {
        onboarding_completed_at: '2026-06-04T12:00:00.000Z',
        onboarding_process_instance_id: 100,
      },
    });
    processRepo.findOne.mockResolvedValue(processRow);
    stepRepo.find.mockResolvedValue([priorStep, finalStep]);
    stepActionRepo.find.mockImplementation(
      async (opts: {
        where: { stepInstanceId: number; runOn: string };
      }) => {
        if (
          opts.where.stepInstanceId === finalStep.stepInstanceId &&
          opts.where.runOn === PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED
        ) {
          return [
            {
              instanceStepActionId: 501,
              stepInstanceId: finalStep.stepInstanceId,
              actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
              runOn: PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
              isActive: true,
              orderIndex: 0,
              config: {
                objectType: 'customer',
                coreIdPath: 'context.customerId',
                corePatch: { status: 'active' },
                metaPatch: {
                  onboarding_completed_at: '2026-06-04T12:00:00.000Z',
                  onboarding_process_instance_id: 100,
                },
              },
            },
          ];
        }
        return [];
      },
    );
  }

  it('process_completed update_sor_field writes customer fields after process completion', async () => {
    mockProcessCompletedCustomerWriteBack();

    await orchestration.runProcessCompleted(100, {
      correlationId: 'corr-onboarding',
      actorUserId: 9,
    });

    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledTimes(1);
    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
      tenantId: 5,
      objectType: 'customer',
      coreId: 42,
      corePatch: { status: 'active' },
      metaPatch: {
        onboarding_completed_at: '2026-06-04T12:00:00.000Z',
        onboarding_process_instance_id: 100,
      },
      customerId: undefined,
    });
    expect(executionLog.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceStepActionId: 501,
        processInstanceId: 100,
        runOn: PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
        actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
      }),
    );
    expect(executionLog.markSucceeded).toHaveBeenCalledWith(
      9001,
      expect.objectContaining({
        objectType: 'customer',
        coreId: 42,
        metaJson: expect.objectContaining({
          onboarding_completed_at: '2026-06-04T12:00:00.000Z',
        }),
      }),
    );
    expect(actionExecutor.executeEmitEventConfig).not.toHaveBeenCalled();
  });

  it('step_completed generate_verification_token writes customer verification meta', async () => {
    stepRepo.findOne.mockResolvedValue(priorStep);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 801,
        actionType: PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
        config: {
          objectType: 'customer',
          coreIdPath: 'context.customerId',
        },
        orderIndex: 0,
      },
    ]);

    await orchestration.runStepCompleted(200, {
      correlationId: 'corr-onboarding',
      actorUserId: 9,
    });

    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
      tenantId: 5,
      objectType: 'customer',
      coreId: 42,
      metaPatch: {
        verification_token: 'fixed-token',
        token_expires_at: '2026-06-27T12:00:00.000Z',
        email_verified: false,
      },
      customerId: undefined,
    });
    expect(executionLog.markSucceeded).toHaveBeenCalledWith(
      9001,
      expect.objectContaining({
        objectType: 'customer',
        coreId: 42,
        token: 'fixed-token',
        verifyUrl: 'https://app.example.com/verify-customer?token=fixed-token',
      }),
    );
  });

  it('step_completed emit_event runs through orchestration into P6', async () => {
    stepRepo.findOne.mockResolvedValue(finalStep);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 601,
        actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
        config: {
          eventName: 'six1-event.process_step_completed',
          data: { stepName: 'Finalize onboarding' },
        },
        orderIndex: 0,
      },
    ]);

    await orchestration.runStepCompleted(201, {
      correlationId: 'corr-onboarding',
      actorUserId: 9,
    });

    expect(actionExecutor.executeEmitEventConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'six1-event.process_step_completed',
        data: { stepName: 'Finalize onboarding' },
      }),
      expect.objectContaining({
        tenantId: 5,
        correlationId: 'corr-onboarding',
      }),
      'process-step-action:601',
    );
    expect(executionLog.markSucceeded).toHaveBeenCalled();
  });

  it('step_completed send_notification delegates to P6', async () => {
    stepRepo.findOne.mockResolvedValue(finalStep);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 602,
        actionType: PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
        config: {
          channelId: 1,
          templateId: 2,
          recipientSpec: { type: 'tenant_admins' },
        },
        orderIndex: 0,
      },
    ]);

    await orchestration.runStepCompleted(201);

    expect(actionExecutor.executeSendNotificationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: 1, templateId: 2 }),
      expect.objectContaining({ tenantId: 5 }),
      'process step action 602',
    );
    expect(executionLog.markSucceeded).toHaveBeenCalled();
  });

  it('step_failed call_webhook runs through orchestration', async () => {
    stepRepo.findOne.mockResolvedValue({
      ...finalStep,
      status: 'failed',
    });
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 603,
        actionType: PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
        config: {
          url: 'https://hooks.example.com/fail',
          method: 'POST',
          body: { alert: true },
        },
        orderIndex: 0,
      },
    ]);

    await orchestration.runStepFailed(201, { correlationId: 'corr-onboarding' });

    expect(webhookClient.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://hooks.example.com/fail',
        tenantId: 5,
        body: expect.objectContaining({
          processInstanceId: 100,
          stepInstanceId: 201,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
          alert: true,
        }),
      }),
    );
    expect(executionLog.markSucceeded).toHaveBeenCalled();
  });

  it('step_completed webhook failure triggers step failure mark (F6.4)', async () => {
    stepRepo.findOne.mockResolvedValue(finalStep);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 604,
        actionType: PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
        config: {
          url: 'https://hooks.example.com/fail',
          method: 'POST',
          body: { alert: true },
        },
        orderIndex: 0,
      },
    ]);
    webhookClient.invoke.mockRejectedValueOnce(new Error('partner 500'));

    await orchestration.runStepCompleted(201, { correlationId: 'corr-onboarding' });

    expect(executionLog.markFailed).toHaveBeenCalled();
    expect(stepFailure.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        stepInstanceId: 201,
        processInstanceId: 100,
        tenantId: 5,
        errorCode: 'step_action_failed',
      }),
    );
  });

  it('orchestration no-ops when step actions feature flag is disabled', async () => {
    flags.isStepActionsEnabled.mockReturnValue(false);
    mockProcessCompletedCustomerWriteBack();

    await orchestration.runProcessCompleted(100);

    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
    expect(actionExecutor.executeEmitEventConfig).not.toHaveBeenCalled();
    expect(executionLog.claim).not.toHaveBeenCalled();
  });

  it('process_completed skips duplicate customer write-back when execution log claim fails', async () => {
    mockProcessCompletedCustomerWriteBack();
    executionLog.claim.mockResolvedValueOnce(null);

    await orchestration.runProcessCompleted(100);

    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
    expect(executionLog.markSucceeded).not.toHaveBeenCalled();
    expect(executionLog.markFailed).not.toHaveBeenCalled();
  });

  it('process_completed evaluates actions on each step in step order', async () => {
    processRepo.findOne.mockResolvedValue(processRow);
    stepRepo.find.mockResolvedValue([priorStep, finalStep]);
    stepActionRepo.find.mockImplementation(
      async (opts: {
        where: { stepInstanceId: number; runOn: string };
      }) => {
        if (
          opts.where.stepInstanceId === priorStep.stepInstanceId &&
          opts.where.runOn === PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED
        ) {
          return [
            {
              instanceStepActionId: 701,
              actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
              config: { eventName: 'six1-event.onboarding_midpoint' },
              orderIndex: 0,
            },
          ];
        }
        if (
          opts.where.stepInstanceId === finalStep.stepInstanceId &&
          opts.where.runOn === PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED
        ) {
          return [
            {
              instanceStepActionId: 702,
              actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
              config: {
                objectType: 'customer',
                coreIdPath: 'context.customerId',
                metaPatch: { onboarding_completed_at: '2026-06-04' },
              },
              orderIndex: 0,
            },
          ];
        }
        return [];
      },
    );

    await orchestration.runProcessCompleted(100);

    expect(stepActionRepo.find).toHaveBeenCalledTimes(2);
    expect(actionExecutor.executeEmitEventConfig).toHaveBeenCalled();
    const emitOrder =
      actionExecutor.executeEmitEventConfig.mock.invocationCallOrder[0];
    const patchOrder =
      configObjectsService.applySorBoundInstancePatch.mock
        .invocationCallOrder[0];
    expect(emitOrder).toBeLessThan(patchOrder);
    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith(
      expect.objectContaining({ objectType: 'customer', coreId: 42 }),
    );
  });

  it('swallows executor failures so lifecycle post-commit hooks never throw', async () => {
    mockProcessCompletedCustomerWriteBack();
    configObjectsService.applySorBoundInstancePatch.mockRejectedValueOnce(
      new Error('customer row locked'),
    );

    await expect(
      orchestration.runProcessCompleted(100),
    ).resolves.toBeUndefined();

    expect(executionLog.markFailed).toHaveBeenCalledWith(
      9001,
      expect.stringContaining('customer row locked'),
    );
  });
});
