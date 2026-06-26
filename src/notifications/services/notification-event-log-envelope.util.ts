import type { EventEnvelope } from '../../events/types';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { parseOptionalPositiveInt } from '../context/notification-context-source.util';

/**
 * Builds a minimal {@link EventEnvelope} from an event log for JSON Logic rule filters.
 */
export function buildEventEnvelopeFromEventLog(
  eventLog: EventLogEntity,
): EventEnvelope {
  const payload =
    eventLog.payload && typeof eventLog.payload === 'object'
      ? (eventLog.payload as Record<string, unknown>)
      : {};

  return {
    eventName: eventLog.event?.name ?? '',
    tenantId:
      parseOptionalPositiveInt(payload.tenantId) ??
      parseOptionalPositiveInt(payload.tenant_id) ??
      undefined,
    userId: eventLog.userId,
    createdBy: eventLog.createdBy ?? eventLog.userId,
    entity:
      eventLog.entityType || eventLog.entityId
        ? {
            entityType: eventLog.entityType ?? undefined,
            entityId: eventLog.entityId ?? undefined,
          }
        : undefined,
    data: payload,
    occurredAt: eventLog.createdAt ?? new Date(),
    correlationId:
      typeof payload.correlationId === 'string' ? payload.correlationId : undefined,
    causationId:
      typeof payload.causationId === 'string' ? payload.causationId : undefined,
  };
}
