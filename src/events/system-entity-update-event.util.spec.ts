import type { EntityMetadata } from 'typeorm';
import type { UpdateEvent } from 'typeorm';
import {
  resolveChangedFieldsFromUpdateEvent,
  resolveEntityPrimaryKey,
  resolveSystemEntityUpdateFromEvent,
  resolveTenantIdFromEntityRecord,
} from './system-entity-update-event.util';

function buildMetadata(tableName: string, pkProperty: string): EntityMetadata {
  return {
    tableName,
    primaryColumns: [{ propertyName: pkProperty }],
  } as EntityMetadata;
}

function buildUpdateEvent(params: {
  tableName: string;
  pkProperty: string;
  entity: Record<string, unknown>;
  updatedPropertyNames: string[];
}): UpdateEvent<unknown> {
  return {
    metadata: buildMetadata(params.tableName, params.pkProperty),
    entity: params.entity,
    updatedColumns: params.updatedPropertyNames.map((propertyName) => ({
      propertyName,
    })),
  } as UpdateEvent<unknown>;
}

describe('system-entity-update-event.util', () => {
  it('resolves tenantId from entity record', () => {
    expect(resolveTenantIdFromEntityRecord({ tenantId: 7 })).toBe(7);
    expect(resolveTenantIdFromEntityRecord({ tenant_id: 8 })).toBe(8);
    expect(resolveTenantIdFromEntityRecord({})).toBeUndefined();
  });

  it('resolves single-column primary key', () => {
    const metadata = buildMetadata('process_instances', 'processInstanceId');
    expect(
      resolveEntityPrimaryKey({ processInstanceId: 42 }, metadata),
    ).toBe(42);
  });

  it('filters audit columns from changed fields', () => {
    const event = buildUpdateEvent({
      tableName: 'tenants',
      pkProperty: 'tenantId',
      entity: { tenantId: 1 },
      updatedPropertyNames: ['name', 'updatedAt', 'updatedBy'],
    });

    expect(resolveChangedFieldsFromUpdateEvent(event)).toEqual(['name']);
  });

  it('resolves system entity update for allowlisted tables', () => {
    const event = buildUpdateEvent({
      tableName: 'process_instances',
      pkProperty: 'processInstanceId',
      entity: {
        processInstanceId: 99,
        tenantId: 5,
      },
      updatedPropertyNames: ['statusId'],
    });

    expect(resolveSystemEntityUpdateFromEvent(event)).toEqual({
      objectType: 'process_instances',
      entityId: 99,
      tenantId: 5,
      changedFields: ['statusId'],
    });
  });

  it('returns null for non-system tables', () => {
    const event = buildUpdateEvent({
      tableName: 'project',
      pkProperty: 'projectId',
      entity: { projectId: 1, tenantId: 2 },
      updatedPropertyNames: ['name'],
    });

    expect(resolveSystemEntityUpdateFromEvent(event)).toBeNull();
  });

  it('returns null when only audit columns changed', () => {
    const event = buildUpdateEvent({
      tableName: 'tenants',
      pkProperty: 'tenantId',
      entity: { tenantId: 1 },
      updatedPropertyNames: ['updatedAt'],
    });

    expect(resolveSystemEntityUpdateFromEvent(event)).toBeNull();
  });
});
