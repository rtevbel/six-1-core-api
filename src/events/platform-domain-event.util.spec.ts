import {
  PLATFORM_SOR_OBJECT_TYPES,
  buildSorBoundDomainEventOptions,
  buildSystemTableDomainEventOptions,
} from './platform-domain-event.util';

describe('platform-domain-event.util', () => {
  it('builds sor_bound domain emit options', () => {
    const opts = buildSorBoundDomainEventOptions({
      objectType: PLATFORM_SOR_OBJECT_TYPES.PROJECT,
      coreId: 42,
      tenantId: 5,
      actorUserId: 3,
      correlationId: 'corr-1',
      data: { processInstanceId: 9 },
    });

    expect(opts.tenantId).toBe(5);
    expect(opts.correlationId).toBe('corr-1');
    expect(opts.entity).toEqual({
      entityType: 'project',
      entityId: 42,
      objectType: 'project',
      resolutionMode: 'sor_bound',
      coreId: 42,
    });
    expect(opts.data).toEqual({
      processInstanceId: 9,
      objectType: 'project',
      resolutionMode: 'sor_bound',
      coreId: 42,
    });
  });

  it('builds system_table domain emit options', () => {
    const opts = buildSystemTableDomainEventOptions({
      objectType: 'process_instances',
      entityId: 100,
      tenantId: 2,
      data: { processTemplateId: 7 },
      refs: { processInstanceId: 100 },
    });

    expect(opts.entity).toEqual({
      entityType: 'process_instances',
      entityId: 100,
      objectType: 'process_instances',
      resolutionMode: 'system_table',
      coreId: 100,
    });
    expect(opts.refs).toEqual({ processInstanceId: 100 });
    expect(opts.data).toEqual({
      processTemplateId: 7,
      objectType: 'process_instances',
      resolutionMode: 'system_table',
      coreId: 100,
    });
  });
});
