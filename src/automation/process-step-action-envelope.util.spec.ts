import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import {
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
} from './process-step-action.constants';
import {
  buildProcessStepActionEnvelope,
  buildProcessStepActionRuntimeContext,
  envelopeEventNameForRunOn,
  resolvePositiveIntFromPath,
} from './process-step-action-envelope.util';

describe('process-step-action-envelope.util', () => {
  const baseParams = {
    tenantId: 1,
    processInstanceId: 100,
    processTemplateId: 10,
    subjectType: 'sor_entity',
    subjectId: 50,
    subjectMetadata: {
      objectType: 'customer',
      resolutionMode: 'sor_bound',
      coreId: 77,
    },
    processContext: { customerId: 77, label: 'Acme' },
    stepInstanceId: 200,
    stepName: 'Verify',
    stepOrder: 1,
    stepStatus: 'completed',
    correlationId: 'corr-1',
    actorUserId: 9,
  };

  it('maps run_on to canonical envelope event names', () => {
    expect(envelopeEventNameForRunOn(PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED)).toBe(
      PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
    );
    expect(envelopeEventNameForRunOn(PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED)).toBe(
      'six1-event.process_step_action',
    );
  });

  it('builds runtime context for coreIdPath resolution', () => {
    const runtime = buildProcessStepActionRuntimeContext({
      ...baseParams,
      runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    });

    expect(runtime.context).toEqual({ customerId: 77, label: 'Acme' });
    expect(runtime.entity).toMatchObject({
      objectType: 'customer',
      coreId: 77,
      resolutionMode: 'sor_bound',
    });
  });

  it('builds step_completed envelope with process refs', () => {
    const envelope = buildProcessStepActionEnvelope({
      ...baseParams,
      runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    });

    expect(envelope.eventName).toBe(PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED);
    expect(envelope.tenantId).toBe(1);
    expect(envelope.correlationId).toBe('corr-1');
    expect(envelope.refs).toEqual({
      processInstanceId: 100,
      stepInstanceId: 200,
      customerCoreId: 77,
    });
    expect(envelope.data).toMatchObject({
      runOn: 'step_completed',
      context: { customerId: 77, label: 'Acme' },
    });
  });

  it('resolves coreId from runtime context paths', () => {
    const runtime = buildProcessStepActionRuntimeContext({
      ...baseParams,
      runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    });

    expect(resolvePositiveIntFromPath(runtime, 'context.customerId')).toBe(77);
    expect(resolvePositiveIntFromPath(runtime, 'entity.coreId')).toBe(77);
    expect(resolvePositiveIntFromPath(runtime, 'context.missing')).toBeNull();
  });
});
