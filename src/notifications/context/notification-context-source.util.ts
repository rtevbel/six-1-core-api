import type { EventEnvelope } from '../../events/types';
import { normalizeEntityRef } from '../../events/types';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import type { NotificationBuildInput } from './notification-context.types';

/** Normalized fields shared by all NV1 context providers. */
export interface NormalizedNotificationContextSource {
  eventName: string | null;
  occurredAt: Date | null;
  correlationId: string | null;
  causationId: string | null;
  tenantId: number | null;
  actorUserId: number | null;
  recipientUserId: number;
  payload: Record<string, unknown>;
  entityType: string | null;
  entityId: number | null;
}

export function parseOptionalPositiveInt(
  value: unknown,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.trunc(n);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function resolveTenantId(
  explicit: number | null | undefined,
  payload: Record<string, unknown>,
): number | null {
  return (
    explicit ??
    parseOptionalPositiveInt(payload.tenantId) ??
    parseOptionalPositiveInt(payload.tenant_id)
  );
}

function normalizeFromEnvelope(
  envelope: EventEnvelope,
  recipientUserId: number,
  explicitTenantId?: number | null,
): NormalizedNotificationContextSource {
  const payload = asRecord(envelope.data);
  const entityRef = normalizeEntityRef(envelope.entity);

  return {
    eventName: envelope.eventName ?? null,
    occurredAt: envelope.occurredAt ?? null,
    correlationId: envelope.correlationId ?? null,
    causationId: envelope.causationId ?? null,
    tenantId: resolveTenantId(
      explicitTenantId ?? parseOptionalPositiveInt(envelope.tenantId),
      payload,
    ),
    actorUserId:
      parseOptionalPositiveInt(envelope.createdBy) ??
      parseOptionalPositiveInt(envelope.userId),
    recipientUserId,
    payload,
    entityType: entityRef?.entityType ?? null,
    entityId: parseOptionalPositiveInt(entityRef?.entityId),
  };
}

function normalizeFromEventLog(
  eventLog: EventLogEntity,
  recipientUserId: number,
  eventNameOverride?: string,
  explicitTenantId?: number | null,
): NormalizedNotificationContextSource {
  const payload = asRecord(eventLog.payload);

  return {
    eventName:
      eventNameOverride ??
      eventLog.event?.name ??
      (typeof payload.eventName === 'string' ? payload.eventName : null),
    occurredAt:
      eventLog.createdAt ??
      (payload.occurredAt ? new Date(String(payload.occurredAt)) : null),
    correlationId:
      typeof payload.correlationId === 'string' ? payload.correlationId : null,
    causationId:
      typeof payload.causationId === 'string' ? payload.causationId : null,
    tenantId: resolveTenantId(explicitTenantId, payload),
    actorUserId:
      parseOptionalPositiveInt(eventLog.createdBy) ??
      parseOptionalPositiveInt(eventLog.userId),
    recipientUserId,
    payload,
    entityType: eventLog.entityType ?? null,
    entityId: parseOptionalPositiveInt(eventLog.entityId),
  };
}

export function normalizeNotificationContextSource(
  input: NotificationBuildInput,
): NormalizedNotificationContextSource {
  if (input.source.kind === 'envelope') {
    return normalizeFromEnvelope(
      input.source.envelope,
      input.recipientUserId,
      input.tenantId,
    );
  }

  return normalizeFromEventLog(
    input.source.eventLog,
    input.recipientUserId,
    input.source.eventName,
    input.tenantId,
  );
}
