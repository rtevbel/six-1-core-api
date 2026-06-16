import type { EntityMetadata } from 'typeorm';
import type { UpdateEvent } from 'typeorm';
import { isSystemTableObjectType } from '../config_objects/object-catalog-scope';

const AUDIT_CHANGED_FIELD_KEYS = new Set([
  'updatedAt',
  'updated_at',
  'updatedBy',
  'updated_by',
  'createdAt',
  'created_at',
  'createdBy',
  'created_by',
]);

/**
 * Resolves tenant scope from common entity property names.
 */
export function resolveTenantIdFromEntityRecord(
  entity: Record<string, unknown>,
): number | undefined {
  for (const key of ['tenantId', 'tenant_id'] as const) {
    const parsed = Number(entity[key]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }
  return undefined;
}

/**
 * Resolves a single numeric primary key from a persisted entity row.
 */
export function resolveEntityPrimaryKey(
  entity: Record<string, unknown>,
  metadata: EntityMetadata,
): number | undefined {
  if (metadata.primaryColumns.length !== 1) {
    return undefined;
  }

  const propertyName = metadata.primaryColumns[0].propertyName;
  const parsed = Number(entity[propertyName]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.trunc(parsed);
}

/**
 * Maps TypeORM updated columns to producer `changedFields`, omitting audit keys.
 */
export function resolveChangedFieldsFromUpdateEvent(
  event: UpdateEvent<unknown>,
): string[] {
  const changed = new Set<string>();

  for (const column of event.updatedColumns ?? []) {
    const propertyName = column.propertyName;
    if (!propertyName || AUDIT_CHANGED_FIELD_KEYS.has(propertyName)) {
      continue;
    }
    changed.add(propertyName);
  }

  return [...changed];
}

export interface ResolvedSystemEntityUpdate {
  objectType: string;
  entityId: number;
  tenantId?: number;
  changedFields: string[];
}

/**
 * Derives a canonical system-entity update from a TypeORM `afterUpdate` event.
 */
export function resolveSystemEntityUpdateFromEvent(
  event: UpdateEvent<unknown>,
): ResolvedSystemEntityUpdate | null {
  const objectType = event.metadata.tableName;
  if (!isSystemTableObjectType(objectType)) {
    return null;
  }

  const entityRecord =
    event.entity && typeof event.entity === 'object'
      ? (event.entity as Record<string, unknown>)
      : null;

  if (!entityRecord) {
    return null;
  }

  const entityId = resolveEntityPrimaryKey(entityRecord, event.metadata);
  if (!entityId) {
    return null;
  }

  const changedFields = resolveChangedFieldsFromUpdateEvent(event);
  if (!changedFields.length) {
    return null;
  }

  return {
    objectType,
    entityId,
    tenantId: resolveTenantIdFromEntityRecord(entityRecord),
    changedFields,
  };
}
