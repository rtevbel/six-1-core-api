import {
  buildEventEnvelope,
  buildPlatformEntityRef,
  buildSorBoundPlatformEntityRef,
  buildSystemTablePlatformEntityRef,
  normalizeEntityRef,
  normalizeEventEnvelopeRefs,
} from './platform-entity-ref.util';

describe('platform-entity-ref.util', () => {
  it('preserves config object binding hints when normalizing entity refs', () => {
    const ref = normalizeEntityRef({
      entityType: 'config_custom_object_instance',
      entityId: 42,
      objectType: 'customer',
      resolutionMode: 'standalone',
      instanceId: 42,
    });

    expect(ref).toEqual({
      entityType: 'config_custom_object_instance',
      entityId: 42,
      objectType: 'customer',
      resolutionMode: 'standalone',
      instanceId: 42,
    });
  });

  it('builds platform entity refs for producers', () => {
    expect(
      buildPlatformEntityRef({
        entityType: 'customer',
        entityId: 7712,
        objectType: 'customer',
        resolutionMode: 'sor_bound',
        coreId: 7712,
      }),
    ).toEqual({
      entityType: 'customer',
      entityId: 7712,
      objectType: 'customer',
      resolutionMode: 'sor_bound',
      coreId: 7712,
    });
  });

  it('builds NV2.5 system_table and sor_bound helper refs', () => {
    expect(buildSystemTablePlatformEntityRef('process_instances', 12)).toEqual({
      entityType: 'process_instances',
      entityId: 12,
      objectType: 'process_instances',
      resolutionMode: 'system_table',
      coreId: 12,
    });
    expect(buildSorBoundPlatformEntityRef('project', 9)).toEqual({
      entityType: 'project',
      entityId: 9,
      objectType: 'project',
      resolutionMode: 'sor_bound',
      coreId: 9,
    });
  });

  it('merges refs from explicit opts and payload keys', () => {
    expect(
      normalizeEventEnvelopeRefs(undefined, {
        processInstanceId: 10,
        step_instance_id: 20,
      }),
    ).toEqual({
      processInstanceId: 10,
      stepInstanceId: 20,
    });
  });

  it('builds envelopes with refs and normalized entity', () => {
    const envelope = buildEventEnvelope('six1-event.process_step_ready', {
      tenantId: 5,
      correlationId: 'corr-1',
      entity: buildPlatformEntityRef({
        entityType: 'ProcessStep',
        entityId: 99,
        objectType: 'project',
        resolutionMode: 'sor_bound',
        coreId: 12,
      }),
      data: {
        processInstanceId: 10,
        stepName: 'Review',
      },
    });

    expect(envelope.refs).toEqual({ processInstanceId: 10 });
    expect(envelope.entity).toMatchObject({
      entityType: 'ProcessStep',
      entityId: 99,
      objectType: 'project',
      resolutionMode: 'sor_bound',
      coreId: 12,
    });
  });
});
