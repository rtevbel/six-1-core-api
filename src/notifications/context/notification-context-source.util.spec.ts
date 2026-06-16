import { normalizeNotificationContextSource } from './notification-context-source.util';

describe('normalizeNotificationContextSource', () => {
  it('normalizes envelope data into payload namespace fields', () => {
    const normalized = normalizeNotificationContextSource({
      source: {
        kind: 'envelope',
        envelope: {
          eventName: 'six1-event.task_assigned',
          userId: 3,
          tenantId: '7',
          data: { taskId: 99, tenant_id: 7 },
        },
      },
      recipientUserId: 8,
    });

    expect(normalized.eventName).toBe('six1-event.task_assigned');
    expect(normalized.tenantId).toBe(7);
    expect(normalized.payload.taskId).toBe(99);
    expect(normalized.actorUserId).toBe(3);
    expect(normalized.recipientUserId).toBe(8);
  });
});
