import { buildEventEnvelopeFromEventLog } from './notification-event-log-envelope.util';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';

describe('buildEventEnvelopeFromEventLog', () => {
  it('maps event log fields into an envelope for rule filters', () => {
    const eventLog = {
      userId: 20,
      createdBy: 10,
      entityId: 7712,
      entityType: 'customer',
      payload: {
        tenantId: 5,
        objectType: 'customer',
        assigneeId: 20,
        correlationId: 'corr-1',
      },
      event: { name: 'six1-event.process_step_ready' },
      createdAt: new Date('2026-06-04T12:00:00.000Z'),
    } as EventLogEntity;

    const envelope = buildEventEnvelopeFromEventLog(eventLog);

    expect(envelope.eventName).toBe('six1-event.process_step_ready');
    expect(envelope.tenantId).toBe(5);
    expect(envelope.userId).toBe(20);
    expect(envelope.createdBy).toBe(10);
    expect(envelope.entity).toEqual({
      entityType: 'customer',
      entityId: 7712,
    });
    expect(envelope.data).toMatchObject({
      objectType: 'customer',
      assigneeId: 20,
    });
    expect(envelope.correlationId).toBe('corr-1');
  });
});
