import type {
  EventEnvelope,
  EventEnvelopeRefs,
  PlatformEntityRef,
  PlatformEntityResolutionMode,
} from './types';

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readResolutionMode(
  value: unknown,
): PlatformEntityResolutionMode | undefined {
  if (
    value === 'standalone' ||
    value === 'sor_bound' ||
    value === 'system_table'
  ) {
    return value;
  }
  return undefined;
}

function readPositiveInt(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

/**
 * Builds an extended entity ref for event producers (NV2.5 / P0.3 pattern).
 */
export function buildPlatformEntityRef(params: {
  entityType: string;
  entityId: number | string;
  objectType: string;
  resolutionMode: PlatformEntityResolutionMode;
  coreId?: number;
  instanceId?: number;
}): PlatformEntityRef {
  return {
    entityType: params.entityType,
    entityId: params.entityId,
    objectType: params.objectType,
    resolutionMode: params.resolutionMode,
    ...(params.coreId != null ? { coreId: params.coreId } : {}),
    ...(params.instanceId != null ? { instanceId: params.instanceId } : {}),
  };
}

/** NV2.5 — standard `system_table` producer entity ref. */
export function buildSystemTablePlatformEntityRef(
  objectType: string,
  entityId: number,
): PlatformEntityRef {
  return buildPlatformEntityRef({
    entityType: objectType,
    entityId,
    objectType,
    resolutionMode: 'system_table',
    coreId: entityId,
  });
}

/** NV2.5 — standard `sor_bound` producer entity ref. */
export function buildSorBoundPlatformEntityRef(
  objectType: string,
  coreId: number,
): PlatformEntityRef {
  return buildPlatformEntityRef({
    entityType: objectType,
    entityId: coreId,
    objectType,
    resolutionMode: 'sor_bound',
    coreId,
  });
}

/**
 * Normalizes an entity reference to {@link PlatformEntityRef}.
 * Preserves config-object binding hints when present on the input object.
 */
export function normalizeEntityRef(input?: unknown): PlatformEntityRef | undefined {
  if (!input) {
    return undefined;
  }

  const record =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;

  if (record && 'entityId' in record && 'entityType' in record) {
    return enrichEntityRef({
      entityType: readString(record.entityType) ?? null,
      entityId:
        record.entityId == null || record.entityId === ''
          ? null
          : (record.entityId as number | string),
      record,
    });
  }

  if (typeof input === 'function') {
    return { entityType: input.name ?? null, entityId: null };
  }

  const entityObject = input as Record<string, unknown>;
  const direct =
    entityObject?.projectId ??
    entityObject?.id ??
    entityObject?._id ??
    entityObject?.entityId ??
    null;

  if (direct != null) {
    return enrichEntityRef({
      entityType: readString(entityObject?.constructor?.name) ?? null,
      entityId: direct as number | string,
      record: entityObject,
    });
  }

  if (typeof entityObject?.getId === 'function') {
    const value = entityObject.getId();
    if (value != null) {
      return enrichEntityRef({
        entityType: readString(entityObject?.constructor?.name) ?? null,
        entityId: value as number | string,
        record: entityObject,
      });
    }
  }

  const proto = Object.getPrototypeOf(input);
  if (proto && typeof proto.getId === 'function') {
    const value = proto.getId.call(input);
    if (value != null) {
      return enrichEntityRef({
        entityType: readString(entityObject?.constructor?.name) ?? null,
        entityId: value as number | string,
        record: entityObject,
      });
    }
  }

  return enrichEntityRef({
    entityType: readString(entityObject?.constructor?.name) ?? null,
    entityId: null,
    record: entityObject,
  });
}

function enrichEntityRef(params: {
  entityType: string | null;
  entityId: number | string | null;
  record: Record<string, unknown> | null;
}): PlatformEntityRef {
  const { entityType, entityId, record } = params;
  if (!record) {
    return { entityType, entityId };
  }

  return {
    entityType,
    entityId,
    objectType:
      readString(record.objectType) ?? readString(record.object_type),
    resolutionMode:
      readResolutionMode(record.resolutionMode) ??
      readResolutionMode(record.resolution_mode),
    coreId:
      readPositiveInt(record.coreId) ?? readPositiveInt(record.core_id),
    instanceId:
      readPositiveInt(record.instanceId) ??
      readPositiveInt(record.instance_id),
  };
}

const REF_PAYLOAD_KEYS: Array<keyof EventEnvelopeRefs> = [
  'processInstanceId',
  'stepInstanceId',
  'customerCoreId',
  'configObjectInstanceId',
];

/**
 * Normalizes explicit refs and falls back to well-known keys on `data`.
 */
export function normalizeEventEnvelopeRefs(
  refs?: EventEnvelopeRefs | null,
  data?: unknown,
): EventEnvelopeRefs | undefined {
  const merged: EventEnvelopeRefs = { ...(refs ?? {}) };
  const payload =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  if (payload) {
    for (const key of REF_PAYLOAD_KEYS) {
      if (merged[key] != null) {
        continue;
      }
      const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      const value =
        readPositiveInt(payload[key]) ?? readPositiveInt(payload[snakeKey]);
      if (value != null) {
        merged[key] = value;
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Builds a canonical {@link EventEnvelope} from emit options.
 */
export function buildEventEnvelope<TData = unknown>(
  eventName: string,
  opts: {
    entity?: object | PlatformEntityRef;
    refs?: EventEnvelopeRefs;
    userId?: number;
    createdBy?: number;
    data?: TData;
    correlationId?: string;
    causationId?: string;
    externalId?: string;
    tenantId?: number | string;
    occurredAt?: Date;
  } = {},
): EventEnvelope<TData> {
  return {
    eventName,
    userId: opts.userId,
    createdBy: opts.createdBy ?? opts.userId,
    entity: normalizeEntityRef(opts.entity),
    refs: normalizeEventEnvelopeRefs(opts.refs, opts.data),
    data: opts.data,
    correlationId: opts.correlationId,
    causationId: opts.causationId,
    externalId: opts.externalId,
    tenantId: opts.tenantId,
    occurredAt: opts.occurredAt ?? new Date(),
  };
}
