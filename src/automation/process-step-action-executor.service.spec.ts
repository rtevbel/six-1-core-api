import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { ActionExecutorService } from '../events/platform-actions/action-executor.service';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepActionEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';
import {
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
  PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
  PROCESS_STEP_ACTION_TYPE_ONBOARD_TENANT,
} from './process-step-action.constants';
import { ProcessStepActionExecutorService } from './process-step-action-executor.service';
import { ProcessStepWebhookClient } from './process-step-webhook.client';
import { ProcessStepActionExecutionLogService } from './process-step-action-execution-log.service';
import { ProcessStepFailureService } from './process-step-failure.service';
import { ProcessStepGenerateVerificationTokenService } from './process-step-generate-verification-token.service';
import { ProcessStepOnboardTenantService } from './process-step-onboard-tenant.service';

describe('ProcessStepActionExecutorService', () => {
  let service: ProcessStepActionExecutorService;
  let actionExecutor: {
    executeEmitEventConfig: jest.Mock;
    executeSendNotificationConfig: jest.Mock;
  };
  let stepActionRepo: { find: jest.Mock };
  let stepRepo: { findOne: jest.Mock; find: jest.Mock };
  let processRepo: { findOne: jest.Mock };
  let configObjectsService: { applySorBoundInstancePatch: jest.Mock };
  let webhookClient: { invoke: jest.Mock };
  let executionLog: {
    claim: jest.Mock;
    markSucceeded: jest.Mock;
    markFailed: jest.Mock;
  };
  let stepFailure: { markFailed: jest.Mock };
  let generateVerificationToken: { execute: jest.Mock };
  let onboardTenant: { execute: jest.Mock };

  const processRow = {
    processInstanceId: 100,
    processTemplateId: 10,
    tenantId: 1,
    subjectType: 'project',
    subjectId: 50,
    subjectMetadata: null,
    context: { customerId: 7 },
    correlationId: 'corr-abc',
  } as unknown as ProcessInstanceEntity;

  const stepRow = {
    stepInstanceId: 200,
    processInstanceId: 100,
    name: 'Review',
    stepOrder: 2,
    status: 'completed',
  } as unknown as ProcessInstanceStepEntity;

  beforeEach(async () => {
    actionExecutor = {
      executeEmitEventConfig: jest.fn().mockResolvedValue({ eventName: 'six1-event.ok' }),
      executeSendNotificationConfig: jest
        .fn()
        .mockResolvedValue({ notificationIds: [42] }),
    };

    stepActionRepo = {
      find: jest.fn(),
    };
    stepRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    processRepo = {
      findOne: jest.fn(),
    };
    configObjectsService = {
      applySorBoundInstancePatch: jest.fn().mockResolvedValue({
        core: { customerId: 7 },
        metaJson: { profile_completed_at: '2026-01-01' },
      }),
    };
    webhookClient = {
      invoke: jest.fn().mockResolvedValue({
        url: 'https://api.partner.io/hook',
        method: 'POST',
        statusCode: 200,
        ok: true,
        responseBodyPreview: '{"ok":true}',
      }),
    };
    executionLog = {
      claim: jest.fn().mockResolvedValue({ executionId: 900 }),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    stepFailure = {
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    generateVerificationToken = {
      execute: jest.fn().mockResolvedValue({
        objectType: 'customer',
        coreId: 7,
        token: 'tok-abc',
        expiresAt: '2026-06-27T12:00:00.000Z',
        verifyUrl: 'https://app.example.com/verify-customer?token=tok-abc',
      }),
    };
    onboardTenant = {
      execute: jest.fn().mockResolvedValue({ tenantId: 9, ownerUserId: 4 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepActionExecutorService,
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
        { provide: ActionExecutorService, useValue: actionExecutor },
        {
          provide: ConfigObjectsService,
          useValue: configObjectsService,
        },
        { provide: ProcessStepWebhookClient, useValue: webhookClient },
        {
          provide: ProcessStepActionExecutionLogService,
          useValue: executionLog,
        },
        { provide: ProcessStepFailureService, useValue: stepFailure },
        {
          provide: ProcessStepGenerateVerificationTokenService,
          useValue: generateVerificationToken,
        },
        {
          provide: ProcessStepOnboardTenantService,
          useValue: onboardTenant,
        },
      ],
    }).compile();

    service = module.get(ProcessStepActionExecutorService);
  });

  it('delegates emit_event to ActionExecutorService for step_completed', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 301,
        actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
        config: {
          eventName: 'six1-event.process_completed',
          data: { ok: true },
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
      { actorUserId: 9 },
    );

    expect(result.skipped).toBe(false);
    expect(result.executed).toHaveLength(1);
    expect(result.executed[0].status).toBe('succeeded');
    expect(executionLog.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceStepActionId: 301,
        stepInstanceId: 200,
        processInstanceId: 100,
        runOn: 'step_completed',
        actionType: 'emit_event',
      }),
    );
    expect(executionLog.markSucceeded).toHaveBeenCalledWith(
      900,
      expect.objectContaining({ eventName: 'six1-event.ok' }),
    );
    expect(actionExecutor.executeEmitEventConfig).toHaveBeenCalledWith(
      { eventName: 'six1-event.process_completed', data: { ok: true } },
      expect.objectContaining({
        tenantId: 1,
        correlationId: 'corr-abc',
        refs: expect.objectContaining({
          processInstanceId: 100,
          stepInstanceId: 200,
        }),
      }),
      'process-step-action:301',
    );
  });

  it('delegates send_notification to ActionExecutorService', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 302,
        actionType: PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
        config: {
          channelId: 1,
          templateId: 2,
          recipientSpec: { type: 'tenant_admins' },
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('succeeded');
    expect(actionExecutor.executeSendNotificationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: 1, templateId: 2 }),
      expect.objectContaining({ tenantId: 1 }),
      'process step action 302',
    );
  });

  it('delegates update_sor_field to ConfigObjectsService.applySorBoundInstancePatch', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 303,
        actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
        config: {
          objectType: 'customer',
          coreIdPath: 'context.customerId',
          metaPatch: { profile_completed_at: '2026-01-01' },
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('succeeded');
    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
      tenantId: 1,
      objectType: 'customer',
      coreId: 7,
      corePatch: undefined,
      metaPatch: { profile_completed_at: '2026-01-01' },
      customerId: undefined,
    });
    expect(result.executed[0].result).toMatchObject({
      objectType: 'customer',
      coreId: 7,
      metaJson: { profile_completed_at: '2026-01-01' },
    });
  });

  it('delegates generate_verification_token to ProcessStepGenerateVerificationTokenService', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 307,
        actionType: PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
        config: {
          objectType: 'customer',
          coreIdPath: 'context.customerId',
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('succeeded');
    expect(generateVerificationToken.execute).toHaveBeenCalledWith(
      {
        objectType: 'customer',
        coreIdPath: 'context.customerId',
      },
      expect.objectContaining({
        tenantId: 1,
        stepInstanceId: 200,
        processContext: { customerId: 7 },
      }),
    );
    expect(result.executed[0].result).toMatchObject({
      token: 'tok-abc',
      verifyUrl: 'https://app.example.com/verify-customer?token=tok-abc',
    });
  });

  it('delegates onboard_tenant to ProcessStepOnboardTenantService', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 308,
        actionType: PROCESS_STEP_ACTION_TYPE_ONBOARD_TENANT,
        config: { registrationObjectType: 'hvac_tenant_registration' },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('succeeded');
    expect(onboardTenant.execute).toHaveBeenCalledWith(
      { registrationObjectType: 'hvac_tenant_registration' },
      expect.objectContaining({
        tenantId: 1,
        stepInstanceId: 200,
        processContext: { customerId: 7 },
      }),
    );
    expect(result.executed[0].result).toMatchObject({
      tenantId: 9,
      ownerUserId: 4,
    });
  });

  it('fails update_sor_field when coreIdPath does not resolve', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue({
      ...processRow,
      context: {},
    });
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 304,
        actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
        config: {
          objectType: 'customer',
          coreIdPath: 'context.customerId',
          metaPatch: { profile_completed_at: '2026-01-01' },
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('failed');
    expect(result.executed[0].errorMessage).toContain('coreIdPath');
    expect(executionLog.markFailed).toHaveBeenCalled();
    expect(stepFailure.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        stepInstanceId: 200,
        processInstanceId: 100,
        tenantId: 1,
        stepOrder: 2,
        errorCode: 'step_action_failed',
      }),
    );
    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
  });

  it('skips duplicate execution when claim returns null', async () => {
    executionLog.claim.mockResolvedValueOnce(null);
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 306,
        actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
        config: { eventName: 'six1-event.process_completed' },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('skipped');
    expect(actionExecutor.executeEmitEventConfig).not.toHaveBeenCalled();
    expect(executionLog.markSucceeded).not.toHaveBeenCalled();
  });

  it('delegates call_webhook to ProcessStepWebhookClient with runtime payload', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([
      {
        instanceStepActionId: 305,
        actionType: PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
        config: {
          url: 'https://api.partner.io/hook',
          method: 'POST',
          body: { source: 'process' },
          timeoutMs: 3000,
        },
        orderIndex: 0,
      },
    ]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result.executed[0].status).toBe('succeeded');
    expect(webhookClient.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.partner.io/hook',
        method: 'POST',
        timeoutMs: 3000,
        tenantId: 1,
        body: expect.objectContaining({
          tenantId: 1,
          processInstanceId: 100,
          stepInstanceId: 200,
          runOn: 'step_completed',
          source: 'process',
          runtime: expect.objectContaining({
            context: { customerId: 7 },
          }),
        }),
      }),
    );
  });

  it('returns skipped when no active actions', async () => {
    stepRepo.findOne.mockResolvedValue(stepRow);
    processRepo.findOne.mockResolvedValue(processRow);
    stepActionRepo.find.mockResolvedValue([]);

    const result = await service.executeForStep(
      200,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    );

    expect(result).toEqual({ executed: [], skipped: true });
  });
});
