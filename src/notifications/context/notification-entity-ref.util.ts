import type {
  NotificationBuildInput,
  NotificationEntityRef,
  NotificationEntityResolutionMode,
} from './notification-context.types';
import { buildPlatformEntityRef } from '../../events/types';
import {
  type NormalizedNotificationContextSource,
  parseOptionalPositiveInt,
} from './notification-context-source.util';

/** Resolved ref used to call `ConfigObjectsService.resolveObjectInstance`. */
export interface NotificationEntityHydrationRef {
  entityType: string | null;
  entityId: number | string | null;
  objectType: string;
  resolutionMode: NotificationEntityResolutionMode;
  coreId?: number;
  instanceId?: number;
}

const LEGACY_SOR_OBJECT_TYPES = new Set([
  'project',
  'task',
  'customer',
  'customer_contact_info',
  'customer_contact',
  'resource',
]);

const STANDALONE_ENTITY_TYPES = new Set([
  'config_custom_object_instance',
  'configcustomobjectinstance',
]);

/**
 * Builds an extended `entity` block for event envelopes (NV2.5 producer pattern).
 */
export function buildNotificationEntityEnvelopeRef(params: {
  entityType: string;
  entityId: number | string;
  objectType: string;
  resolutionMode: NotificationEntityResolutionMode;
  coreId?: number;
  instanceId?: number;
}): NotificationEntityRef & {
  objectType: string;
  resolutionMode: NotificationEntityResolutionMode;
} {
  return buildPlatformEntityRef(params) as NotificationEntityRef & {
    objectType: string;
    resolutionMode: NotificationEntityResolutionMode;
  };
}

function normalizeLegacyEntityType(
  entityType?: string | null,
): string | null {
  if (!entityType) {
    return null;
  }
  return entityType.toLowerCase().replace(/entity$/, '');
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeEntityId(value: unknown): string | number | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function readResolutionMode(
  value: unknown,
): NotificationEntityResolutionMode | null {
  if (
    value === 'standalone' ||
    value === 'sor_bound' ||
    value === 'system_table'
  ) {
    return value;
  }
  return null;
}

function asEnvelopeEntityRecord(
  input: NotificationBuildInput,
): Record<string, unknown> | null {
  if (input.source.kind !== 'envelope' || !input.source.envelope.entity) {
    return null;
  }

  const entity = input.source.envelope.entity;
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    return null;
  }

  return entity as Record<string, unknown>;
}

function normalizeExplicitEntityRef(
  ref?: NotificationEntityRef | null,
): NotificationEntityHydrationRef | null {
  if (!ref) {
    return null;
  }

  const objectType = readString(ref.objectType);
  const resolutionMode = ref.resolutionMode ?? null;
  const coreId = parseOptionalPositiveInt(ref.coreId);
  const instanceId = parseOptionalPositiveInt(ref.instanceId);

  if (!objectType || !resolutionMode) {
    return null;
  }

  if (resolutionMode === 'standalone' && !instanceId) {
    return null;
  }

  if (resolutionMode === 'sor_bound' && !coreId) {
    return null;
  }

  return {
    entityType: readString(ref.entityType),
    entityId: normalizeEntityId(ref.entityId),
    objectType,
    resolutionMode,
    coreId: coreId ?? undefined,
    instanceId: instanceId ?? undefined,
  };
}

function parseEnvelopeEntityRef(
  input: NotificationBuildInput,
  source: NormalizedNotificationContextSource,
): NotificationEntityHydrationRef | null {
  const entity = asEnvelopeEntityRecord(input);
  if (!entity) {
    return null;
  }

  const objectType =
    readString(entity.objectType) ??
    readString(entity.object_type) ??
    inferObjectTypeFromEntityType(
      normalizeLegacyEntityType(readString(entity.entityType)),
    );
  const resolutionMode =
    readResolutionMode(entity.resolutionMode) ??
    readResolutionMode(entity.resolution_mode);
  const coreId =
    parseOptionalPositiveInt(entity.coreId) ??
    parseOptionalPositiveInt(entity.core_id);
  const instanceId =
    parseOptionalPositiveInt(entity.instanceId) ??
    parseOptionalPositiveInt(entity.instance_id);
  const entityType =
    normalizeLegacyEntityType(readString(entity.entityType)) ??
    source.entityType;
  const entityId =
    entity.entityId ??
    entity.entity_id ??
    source.entityId ??
    coreId ??
    instanceId ??
    null;

  if (!objectType) {
    return null;
  }

  if (resolutionMode === 'standalone' && instanceId) {
    return {
      entityType,
      entityId: normalizeEntityId(entityId),
      objectType,
      resolutionMode: 'standalone',
      instanceId,
    };
  }

  if (resolutionMode === 'sor_bound' && coreId) {
    return {
      entityType,
      entityId: normalizeEntityId(entityId),
      objectType,
      resolutionMode: 'sor_bound',
      coreId,
    };
  }

  if (instanceId && !coreId) {
    return {
      entityType,
      entityId: normalizeEntityId(entityId),
      objectType,
      resolutionMode: 'standalone',
      instanceId,
    };
  }

  if (coreId && !instanceId) {
    return {
      entityType,
      entityId: normalizeEntityId(entityId),
      objectType,
      resolutionMode: 'sor_bound',
      coreId,
    };
  }

  const resolvedEntityId = parseOptionalPositiveInt(entityId);
  if (
    objectType &&
    LEGACY_SOR_OBJECT_TYPES.has(objectType) &&
    resolvedEntityId
  ) {
    return {
      entityType,
      entityId: resolvedEntityId,
      objectType,
      resolutionMode: 'sor_bound',
      coreId: resolvedEntityId,
    };
  }

  return null;
}

function inferObjectTypeFromEntityType(
  entityType: string | null,
): string | null {
  if (!entityType || !LEGACY_SOR_OBJECT_TYPES.has(entityType)) {
    return null;
  }
  return entityType;
}

function readPayloadObjectType(
  payload: Record<string, unknown>,
): string | null {
  return (
    readString(payload.objectType) ??
    readString(payload.object_type) ??
    readString(payload.configObjectType) ??
    readString(payload.config_object_type)
  );
}

function inferLegacyEntityRef(
  source: NormalizedNotificationContextSource,
): NotificationEntityHydrationRef | null {
  const entityType = normalizeLegacyEntityType(source.entityType);
  const entityId = source.entityId;

  if (!entityType) {
    return null;
  }

  if (STANDALONE_ENTITY_TYPES.has(entityType)) {
    const instanceId =
      entityId ??
      parseOptionalPositiveInt(source.payload.configCustomObjectInstanceId) ??
      parseOptionalPositiveInt(source.payload.config_custom_object_instance_id);
    const objectType = readPayloadObjectType(source.payload);

    if (!instanceId || !objectType) {
      return null;
    }

    return {
      entityType,
      entityId: instanceId,
      objectType,
      resolutionMode: 'standalone',
      instanceId,
    };
  }

  if (LEGACY_SOR_OBJECT_TYPES.has(entityType) && entityId) {
    return {
      entityType,
      entityId,
      objectType: entityType,
      resolutionMode: 'sor_bound',
      coreId: entityId,
    };
  }

  return null;
}

/**
 * Resolves config-object hydration coordinates from build input and source.
 */
export function resolveNotificationEntityRef(
  input: NotificationBuildInput,
  source: NormalizedNotificationContextSource,
): NotificationEntityHydrationRef | null {
  return (
    normalizeExplicitEntityRef(input.entityRef) ??
    parseEnvelopeEntityRef(input, source) ??
    inferLegacyEntityRef(source)
  );
}
