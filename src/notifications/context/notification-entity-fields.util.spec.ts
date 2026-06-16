import type { ConfigObjectResolvedSorInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import type { ConfigObjectResolvedStandaloneInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import {
  buildEntityFieldsFromResolvedInstance,
  resolveEntityDisplayLabel,
} from './notification-entity-fields.util';

describe('notification-entity-fields.util', () => {
  it('maps standalone dynamicFields to entity.fields', () => {
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
      dynamicFields: { companyName: 'Acme Corp', status: 'active' },
      sections: [],
    };

    expect(buildEntityFieldsFromResolvedInstance(resolved)).toEqual({
      companyName: 'Acme Corp',
      status: 'active',
    });
    expect(
      resolveEntityDisplayLabel(buildEntityFieldsFromResolvedInstance(resolved)),
    ).toBe('Acme Corp');
  });

  it('merges sor core columns with custom dynamicFields', () => {
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
          {
            fieldKey: 'project_type',
            label: 'Type',
            fieldType: 'text',
            orderIndex: 2,
          },
        ],
        mergedFieldOrder: [
          { source: 'sor', fieldKey: 'name' },
          { source: 'custom', fieldKey: 'project_type' },
        ],
      } as ConfigObjectResolvedSorInstance['schema'],
      core: {
        projectId: 1001,
        name: 'Alpha',
      } as ConfigObjectResolvedSorInstance['core'],
      dynamicFields: { project_type: 'internal' },
      sections: [],
    };

    expect(buildEntityFieldsFromResolvedInstance(resolved)).toEqual({
      name: 'Alpha',
      project_type: 'internal',
    });
  });
});
