import { Test, TestingModule } from '@nestjs/testing';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import type { ConfigObjectResolvedSorInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import type { ConfigObjectResolvedStandaloneInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import { createEmptyNotificationContext } from './notification-context.types';
import { ConfigObjectVariableProvider } from './providers/config-object-variable.provider';

describe('ConfigObjectVariableProvider', () => {
  let provider: ConfigObjectVariableProvider;
  let configObjectsService: jest.Mocked<
    Pick<ConfigObjectsService, 'resolveObjectInstance' | 'getRelatedObjects'>
  >;

  beforeEach(async () => {
    configObjectsService = {
      resolveObjectInstance: jest.fn(),
      getRelatedObjects: jest.fn().mockResolvedValue({
        objectType: 'project',
        coreId: 1001,
        relationships: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigObjectVariableProvider,
        { provide: ConfigObjectsService, useValue: configObjectsService },
      ],
    }).compile();

    provider = module.get(ConfigObjectVariableProvider);
  });

  it('skips hydration when requiredPaths do not reference entity fields', async () => {
    const context = createEmptyNotificationContext();

    await provider.apply(
      context,
      {
        eventName: 'six1-event.project_created',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: { projectId: 1001 },
        entityType: 'project',
        entityId: 1001,
      },
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.project_created',
            tenantId: 5,
            entity: { entityType: 'project', entityId: 1001 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['payload.projectId'] },
    );

    expect(configObjectsService.resolveObjectInstance).not.toHaveBeenCalled();
    expect(context.entity.fields).toEqual({});
  });

  it('hydrates sor_bound entity.fields when required', async () => {
    const resolved: ConfigObjectResolvedSorInstance = {
      resolutionMode: 'sor_bound',
      objectType: 'project',
      coreId: 1001,
      tenantId: 5,
      schema: {
        fieldRegistry: [
          {
            fieldKey: 'name',
            label: 'Name',
            fieldType: 'text',
            orderIndex: 1,
          },
        ],
        mergedFieldOrder: [{ source: 'sor', fieldKey: 'name' }],
      } as ConfigObjectResolvedSorInstance['schema'],
      core: { projectId: 1001, name: 'Alpha' } as ConfigObjectResolvedSorInstance['core'],
      dynamicFields: {},
      sections: [],
    };
    configObjectsService.resolveObjectInstance.mockResolvedValue(resolved);

    const context = createEmptyNotificationContext();
    await provider.apply(
      context,
      {
        eventName: 'six1-event.project_created',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: { projectId: 1001 },
        entityType: 'project',
        entityId: 1001,
      },
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.project_created',
            tenantId: 5,
            entity: { entityType: 'project', entityId: 1001 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['entity.fields.name'] },
    );

    expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
      5,
      'project',
      1001,
      undefined,
    );
    expect(context.entity.fields.name).toBe('Alpha');
    expect(context.entity.displayLabel).toBe('Alpha');
    expect(context.entity.resolutionMode).toBe('sor_bound');
  });

  it('hydrates standalone entity.fields when required', async () => {
    const resolved: ConfigObjectResolvedStandaloneInstance = {
      resolutionMode: 'standalone',
      objectType: 'onboarding_form',
      instanceId: 77,
      tenantId: 5,
      schema: {
        fieldRegistry: [
          {
            fieldKey: 'companyName',
            label: 'Company',
            fieldType: 'text',
            orderIndex: 1,
          },
        ],
      } as ConfigObjectResolvedStandaloneInstance['schema'],
      dynamicFields: { companyName: 'Acme Corp' },
      sections: [],
    };
    configObjectsService.resolveObjectInstance.mockResolvedValue(resolved);

    const context = createEmptyNotificationContext();
    await provider.apply(
      context,
      {
        eventName: 'six1-event.config_object_instance.updated',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: {},
        entityType: 'config_custom_object_instance',
        entityId: 77,
      },
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
        recipientUserId: 20,
      },
      { requiredPaths: ['entity.fields.companyName'] },
    );

    expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
      5,
      'onboarding_form',
      undefined,
      77,
    );
    expect(context.entity.fields.companyName).toBe('Acme Corp');
    expect(context.entity.instanceId).toBe(77);
  });

  it('hydrates entity.relations when required paths reference relations', async () => {
    const resolved: ConfigObjectResolvedSorInstance = {
      resolutionMode: 'sor_bound',
      objectType: 'project',
      coreId: 1001,
      tenantId: 5,
      schema: {
        fieldRegistry: [
          {
            fieldKey: 'name',
            label: 'Name',
            fieldType: 'text',
            orderIndex: 1,
          },
        ],
        mergedFieldOrder: [{ source: 'sor', fieldKey: 'name' }],
        relations: [
          {
            fromObjectType: 'project',
            toObjectType: 'customer',
            relationshipKey: 'billingContact',
            displayName: 'Billing contact',
            cardinality: 'many_to_one',
            relationshipSource: 'orm',
            isActive: true,
            queryConfig: {},
          },
        ],
        relatedFieldRegistryByRelationKey: {
          billingContact: [
            {
              fieldKey: 'email',
              label: 'Email',
              fieldType: 'text',
              orderIndex: 1,
            },
          ],
        },
      } as ConfigObjectResolvedSorInstance['schema'],
      core: { projectId: 1001, name: 'Alpha' } as ConfigObjectResolvedSorInstance['core'],
      dynamicFields: {},
      sections: [],
    };

    configObjectsService.resolveObjectInstance
      .mockResolvedValueOnce(resolved)
      .mockResolvedValueOnce({
        resolutionMode: 'sor_bound',
        objectType: 'customer',
        coreId: 42,
        tenantId: 5,
        schema: {
          fieldRegistry: [
            {
              fieldKey: 'email',
              label: 'Email',
              fieldType: 'text',
              orderIndex: 1,
            },
          ],
          mergedFieldOrder: [{ source: 'sor', fieldKey: 'email' }],
        },
        core: { customerId: 42, email: 'billing@example.com' },
        dynamicFields: {},
        sections: [],
      } as ConfigObjectResolvedSorInstance);

    configObjectsService.getRelatedObjects.mockResolvedValue({
      objectType: 'project',
      coreId: 1001,
      relationships: {
        billingContact: [{ customerId: 42 }],
      },
    });

    const context = createEmptyNotificationContext();
    await provider.apply(
      context,
      {
        eventName: 'six1-event.project_created',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: { projectId: 1001 },
        entityType: 'project',
        entityId: 1001,
      },
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.project_created',
            tenantId: 5,
            entity: { entityType: 'project', entityId: 1001 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['entity.relations.billingContact.fields.email'] },
    );

    expect(context.entity.relations.billingContact?.fields.email).toBe(
      'billing@example.com',
    );
  });

  it('hydrates legacy flat variables for sor_bound objects (NV6.3)', async () => {
    const resolved: ConfigObjectResolvedSorInstance = {
      resolutionMode: 'sor_bound',
      objectType: 'project',
      coreId: 1001,
      tenantId: 5,
      schema: {
        fieldRegistry: [
          {
            fieldKey: 'name',
            label: 'Name',
            fieldType: 'text',
            orderIndex: 1,
          },
        ],
        mergedFieldOrder: [{ fieldKey: 'name', source: 'sor' }],
      },
      core: { projectId: 1001, name: 'Hydrated Project' },
      dynamicFields: {},
    };
    configObjectsService.resolveObjectInstance.mockResolvedValue(resolved);

    const variables: Record<string, unknown> = {};
    const hydrated = await provider.hydrateLegacyFlatVariables(
      variables,
      5,
      'project',
      1001,
      { projectName: 'name', projectId: 'projectId' },
    );

    expect(hydrated).toBe(true);
    expect(variables.projectName).toBe('Hydrated Project');
    expect(variables.projectId).toBe(1001);
  });
});
