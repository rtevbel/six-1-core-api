import type { ConfigObjectsService } from '../../config_objects/config_objects.service';
import type { ConfigObjectResolvedSorInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import { createEmptyNotificationContext } from './notification-context.types';
import { hydrateEntityRelations } from './notification-entity-relation-hydrator.util';

describe('hydrateEntityRelations', () => {
  it('hydrates related entity fields via resolveObjectInstance', async () => {
    const parentResolved: ConfigObjectResolvedSorInstance = {
      resolutionMode: 'sor_bound',
      objectType: 'project',
      coreId: 1001,
      tenantId: 5,
      schema: {
        fieldRegistry: [],
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
      core: { projectId: 1001 } as ConfigObjectResolvedSorInstance['core'],
      dynamicFields: {},
      sections: [],
    };

    const relatedResolved: ConfigObjectResolvedSorInstance = {
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
      } as ConfigObjectResolvedSorInstance['schema'],
      core: { customerId: 42, email: 'billing@example.com' } as ConfigObjectResolvedSorInstance['core'],
      dynamicFields: {},
      sections: [],
    };

    const configObjectsService = {
      getRelatedObjects: jest.fn().mockResolvedValue({
        objectType: 'project',
        coreId: 1001,
        relationships: {
          billingContact: [{ customerId: 42 }],
        },
      }),
      resolveObjectInstance: jest.fn().mockResolvedValue(relatedResolved),
    } as unknown as ConfigObjectsService;

    const context = createEmptyNotificationContext();
    await hydrateEntityRelations(
      configObjectsService,
      context,
      5,
      'project',
      parentResolved,
      ['entity.relations.billingContact.fields.email'],
    );

    expect(configObjectsService.getRelatedObjects).toHaveBeenCalledWith(
      5,
      'project',
      1001,
    );
    expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
      5,
      'customer',
      42,
    );
    expect(context.entity.relations.billingContact).toEqual({
      objectType: 'customer',
      coreId: 42,
      instanceId: null,
      fields: { email: 'billing@example.com' },
    });
  });

  it('skips hydration for non sor_bound parents', async () => {
    const configObjectsService = {
      getRelatedObjects: jest.fn(),
      resolveObjectInstance: jest.fn(),
    } as unknown as ConfigObjectsService;

    const context = createEmptyNotificationContext();
    await hydrateEntityRelations(
      configObjectsService,
      context,
      5,
      'onboarding_form',
      {
        resolutionMode: 'standalone',
        objectType: 'onboarding_form',
        instanceId: 9,
        tenantId: 5,
        schema: { fieldRegistry: [] },
        dynamicFields: {},
        sections: [],
      },
      ['entity.relations.owner.fields.name'],
    );

    expect(configObjectsService.getRelatedObjects).not.toHaveBeenCalled();
    expect(context.entity.relations).toEqual({});
  });
});
