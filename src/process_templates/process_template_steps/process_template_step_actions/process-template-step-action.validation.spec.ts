import { RpcException } from '@nestjs/microservices';
import { assertProcessTemplateStepActionAllowed } from './process-template-step-action.validation';
import {
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
} from '../../../automation/process-step-action.constants';

describe('assertProcessTemplateStepActionAllowed', () => {
  const stepRepository = {
    findOne: jest.fn(),
  };
  const configObjectRepository = {
    findOne: jest.fn(),
  };
  const notificationTemplateRepository = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stepRepository.findOne.mockResolvedValue({
      processTemplateStepId: 10,
      processTemplate: { tenantId: 5 },
    });
  });

  it('rejects when tenant scope does not match the template', async () => {
    await expect(
      assertProcessTemplateStepActionAllowed(
        stepRepository as never,
        configObjectRepository as never,
        notificationTemplateRepository as never,
        {
          processTemplateStepId: 10,
          actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
          config: { eventName: 'six1-event.process_completed' },
          tenantId: 99,
        },
      ),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('allows emit_event when tenant scope matches', async () => {
    await expect(
      assertProcessTemplateStepActionAllowed(
        stepRepository as never,
        configObjectRepository as never,
        notificationTemplateRepository as never,
        {
          processTemplateStepId: 10,
          actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
          config: { eventName: 'six1-event.process_completed' },
          tenantId: 5,
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported object_type for update_sor_field', async () => {
    await expect(
      assertProcessTemplateStepActionAllowed(
        stepRepository as never,
        configObjectRepository as never,
        notificationTemplateRepository as never,
        {
          processTemplateStepId: 10,
          actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
          config: {
            objectType: 'unknown_type',
            coreIdPath: 'context.customerId',
          },
          tenantId: 5,
        },
      ),
    ).rejects.toThrow(/not supported for update_sor_field/);
  });

  it('rejects update_sor_field when config object tenant mismatches template', async () => {
    configObjectRepository.findOne.mockResolvedValue({
      objectType: 'customer',
      templateSet: { tenantId: 99 },
    });

    await expect(
      assertProcessTemplateStepActionAllowed(
        stepRepository as never,
        configObjectRepository as never,
        notificationTemplateRepository as never,
        {
          processTemplateStepId: 10,
          actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
          config: {
            objectType: 'customer',
            coreIdPath: 'context.customerId',
            corePatch: { status: 'active' },
          },
          tenantId: 5,
        },
      ),
    ).rejects.toThrow(/Config object tenant does not match/);
  });

  it('rejects send_notification when template channel mismatches config', async () => {
    notificationTemplateRepository.findOne.mockResolvedValue({
      templateId: 2,
      channelId: 9,
    });

    await expect(
      assertProcessTemplateStepActionAllowed(
        stepRepository as never,
        configObjectRepository as never,
        notificationTemplateRepository as never,
        {
          processTemplateStepId: 10,
          actionType: PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
          runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
          config: {
            channelId: 1,
            templateId: 2,
            recipientSpec: { type: 'tenant_admins' },
          },
          tenantId: 5,
        },
      ),
    ).rejects.toThrow(/does not belong to the configured channel/);
  });
});
