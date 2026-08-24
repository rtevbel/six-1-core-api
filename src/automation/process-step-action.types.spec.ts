import {
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
  PROCESS_STEP_ACTION_TYPE_ONBOARD_TENANT,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
} from './process-step-action.constants';
import { parseProcessStepActionConfig } from './process-step-action.types';

describe('process-step-action.types', () => {
  it('parses emit_event config using platform shape', () => {
    const parsed = parseProcessStepActionConfig(
      PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
      { eventName: 'six1-event.process_completed', data: { ok: true } },
    );
    expect(parsed).toEqual({
      eventName: 'six1-event.process_completed',
      data: { ok: true },
    });
  });

  it('parses send_notification config using platform shape', () => {
    const parsed = parseProcessStepActionConfig(
      PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
      {
        channelId: 1,
        templateId: 2,
        recipientSpec: { type: 'tenant_admins' },
      },
    );
    expect(parsed).toMatchObject({
      channelId: 1,
      templateId: 2,
      recipientSpec: { type: 'tenant_admins' },
    });
  });

  it('parses update_sor_field config', () => {
    const parsed = parseProcessStepActionConfig(
      PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
      {
        objectType: 'customer',
        coreIdPath: 'context.customerId',
        corePatch: { name: 'Acme' },
      },
    );
    expect(parsed).toEqual({
      objectType: 'customer',
      coreIdPath: 'context.customerId',
      corePatch: { name: 'Acme' },
    });
  });

  it('parses generate_verification_token config', () => {
    const parsed = parseProcessStepActionConfig(
      PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
      {
        objectType: 'customer',
        coreIdPath: 'context.customerId',
        ttlHours: 48,
        clearVerifiedBeforeIssue: false,
      },
    );
    expect(parsed).toEqual({
      objectType: 'customer',
      coreIdPath: 'context.customerId',
      ttlHours: 48,
      clearVerifiedBeforeIssue: false,
    });
  });

  it('parses onboard_tenant config with optional object type', () => {
    expect(
      parseProcessStepActionConfig(PROCESS_STEP_ACTION_TYPE_ONBOARD_TENANT, {}),
    ).toEqual({});
    expect(
      parseProcessStepActionConfig(PROCESS_STEP_ACTION_TYPE_ONBOARD_TENANT, {
        registrationObjectType: 'hvac_tenant_registration',
      }),
    ).toEqual({ registrationObjectType: 'hvac_tenant_registration' });
  });

  it('returns null for invalid config', () => {
    expect(
      parseProcessStepActionConfig(
        PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
        { objectType: 'customer' },
      ),
    ).toBeNull();
  });
});
