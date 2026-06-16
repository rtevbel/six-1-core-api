import { resolveProcessRef } from './notification-process-ref.util';

describe('resolveProcessRef', () => {
  const baseSource = {
    eventName: 'six1-event.process_step_ready',
    occurredAt: null,
    correlationId: 'corr-1',
    causationId: null,
    tenantId: 5,
    actorUserId: 10,
    recipientUserId: 20,
    payload: {
      processInstanceId: 42,
      stepOrder: 3,
    },
    entityType: 'processstep',
    entityId: 456,
  };

  it('reads process refs from payload and ProcessStep entity', () => {
    const ref = resolveProcessRef(
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.process_step_ready',
            entity: { entityType: 'ProcessStep', entityId: 456 },
            data: { processInstanceId: 42, stepOrder: 3 },
          },
        },
        recipientUserId: 20,
      },
      baseSource,
    );

    expect(ref).toEqual({
      processInstanceId: 42,
      stepInstanceId: 456,
      stepName: null,
      stepOrder: 3,
      processTemplateId: null,
      stepStatus: null,
      processStatus: null,
    });
  });

  it('reads explicit refs from input.refs', () => {
    const ref = resolveProcessRef(
      {
        source: {
          kind: 'envelope',
          envelope: { eventName: 'six1-event.process_step_ready' },
        },
        recipientUserId: 20,
        refs: { processInstanceId: 99, stepInstanceId: 100 },
      },
      {
        ...baseSource,
        payload: {},
        entityType: null,
        entityId: null,
      },
    );

    expect(ref.processInstanceId).toBe(99);
    expect(ref.stepInstanceId).toBe(100);
  });
});
