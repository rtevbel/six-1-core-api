import {
  buildNotificationEntityEnvelopeRef,
  resolveNotificationEntityRef,
} from './notification-entity-ref.util';

describe('notification-entity-ref.util', () => {
  it('builds extended envelope entity refs', () => {
    expect(
      buildNotificationEntityEnvelopeRef({
        entityType: 'config_custom_object_instance',
        entityId: 77,
        objectType: 'onboarding_form',
        resolutionMode: 'standalone',
        instanceId: 77,
      }),
    ).toEqual({
      entityType: 'config_custom_object_instance',
      entityId: 77,
      objectType: 'onboarding_form',
      resolutionMode: 'standalone',
      instanceId: 77,
    });
  });

  it('parses extended envelope entity blocks', () => {
    const ref = resolveNotificationEntityRef(
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.config_object_instance.updated',
            tenantId: 5,
            entity: {
              entityType: 'config_custom_object_instance',
              entityId: 77,
              objectType: 'onboarding_form',
              resolutionMode: 'standalone',
              instanceId: 77,
            },
          },
        },
        recipientUserId: 10,
      },
      {
        eventName: 'six1-event.config_object_instance.updated',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 10,
        payload: {},
        entityType: 'config_custom_object_instance',
        entityId: 77,
      },
    );

    expect(ref).toEqual({
      entityType: 'config_custom_object_instance',
      entityId: 77,
      objectType: 'onboarding_form',
      resolutionMode: 'standalone',
      instanceId: 77,
    });
  });

  it('infers legacy sor_bound project refs', () => {
    const ref = resolveNotificationEntityRef(
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.project_created',
            entity: { entityType: 'project', entityId: 1001 },
          },
        },
        recipientUserId: 10,
      },
      {
        eventName: 'six1-event.project_created',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 10,
        payload: { projectId: 1001 },
        entityType: 'project',
        entityId: 1001,
      },
    );

    expect(ref).toEqual({
      entityType: 'project',
      entityId: 1001,
      objectType: 'project',
      resolutionMode: 'sor_bound',
      coreId: 1001,
    });
  });
});
