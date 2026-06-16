import {
  buildSorBoundInstanceUpdatedEventOptions,
  buildStandaloneConfigObjectInstanceUpdatedOptions,
  buildSystemEntityUpdatedEventOptions,
  resolveTenantIdFromSorCore,
} from './platform-config-object-event.util';
import { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';

describe('platform-config-object-event.util', () => {
  it('builds standalone updated envelope', () => {
    const opts = buildStandaloneConfigObjectInstanceUpdatedOptions({
      configCustomObjectInstanceId: 9,
      configObjectId: 2,
      objectType: 'checklist',
      tenantId: 5,
      actorUserId: 3,
      changedFields: ['status'],
    });

    expect(opts.tenantId).toBe(5);
    expect(opts.correlationId).toEqual(expect.any(String));
    expect(opts.data).toEqual(
      expect.objectContaining({
        resolutionMode: 'standalone',
        changedFields: ['status'],
      }),
    );
    expect(opts.entity).toEqual(
      expect.objectContaining({
        resolutionMode: 'standalone',
        instanceId: 9,
      }),
    );
  });

  it('builds sor_bound updated envelope', () => {
    const opts = buildSorBoundInstanceUpdatedEventOptions({
      objectType: 'customer',
      coreId: 7712,
      tenantId: 5,
      changedFields: ['profile_completed_at'],
    });

    expect(opts.data).toEqual({
      objectType: 'customer',
      resolutionMode: 'sor_bound',
      coreId: 7712,
      tenantId: 5,
      changedFields: ['profile_completed_at'],
    });
  });

  it('resolves tenantId from sor core row', () => {
    expect(resolveTenantIdFromSorCore({ tenantId: 12 })).toBe(12);
    expect(resolveTenantIdFromSorCore({})).toBeUndefined();
  });

  it('builds system_table updated envelope', () => {
    const opts = buildSystemEntityUpdatedEventOptions({
      objectType: 'process_instances',
      entityId: 44,
      tenantId: 5,
      changedFields: ['statusId'],
      actorUserId: 2,
    });

    expect(opts.data).toEqual({
      objectType: 'process_instances',
      resolutionMode: 'system_table',
      entityId: 44,
      coreId: 44,
      tenantId: 5,
      changedFields: ['statusId'],
      updatedBy: 2,
    });
    expect(opts.entity).toEqual(
      expect.objectContaining({
        resolutionMode: 'system_table',
        coreId: 44,
      }),
    );
  });

  it('uses canonical event names', () => {
    expect(PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED).toBe(
      'six1-event.sor_bound_instance.updated',
    );
    expect(PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED).toBe(
      'six1-event.system_entity.updated',
    );
  });
});
