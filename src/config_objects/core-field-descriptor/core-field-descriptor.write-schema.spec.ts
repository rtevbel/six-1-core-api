import { generateBaseCoreFieldDescriptorsFromSorRegistry } from './core-field-descriptor.generator';
import {
  finalizeCoreFieldDescriptors,
  mergeWriteSchemaCapabilities,
} from './core-field-descriptor.write-schema';
import { inferDtoCapabilityOverridesForObjectType } from './dto-write-capability.util';

describe('mergeWriteSchemaCapabilities', () => {
  it('marks SoR read-only IDs as non-writable', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    const merged = mergeWriteSchemaCapabilities(base, {
      bindingMode: 'sor_bound',
      objectType: 'project',
    });
    const id = merged.find((d) => d.fieldKey === 'projectId');
    expect(id?.canCreate).toBe(false);
    expect(id?.canUpdate).toBe(false);
    const name = merged.find((d) => d.fieldKey === 'name');
    expect(name?.canCreate).toBe(true);
    expect(name?.canUpdate).toBe(true);
  });

  it('respects overrides over inference', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('task');
    const merged = mergeWriteSchemaCapabilities(base, {
      bindingMode: 'sor_bound',
      objectType: 'task',
      overrides: {
        name: { canCreate: false, canUpdate: false },
      },
    });
    const name = merged.find((d) => d.fieldKey === 'name');
    expect(name?.canCreate).toBe(false);
    expect(name?.canUpdate).toBe(false);
  });

  it('applies explicit required overrides', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('task');
    const merged = mergeWriteSchemaCapabilities(base, {
      bindingMode: 'sor_bound',
      objectType: 'task',
      overrides: {
        name: { requiredOnCreate: true },
      },
    });
    expect(merged.find((d) => d.fieldKey === 'name')?.requiredOnCreate).toBe(true);
  });

  it('allows writable system_table fields unless descriptor is readOnly', () => {
    const merged = mergeWriteSchemaCapabilities(
      [
        {
          fieldKey: 'name',
          label: 'Name',
          fieldType: 'text',
          orderIndex: 10,
        },
        {
          fieldKey: 'createdAt',
          label: 'Created at',
          fieldType: 'date',
          orderIndex: 20,
          readOnly: true,
        },
      ],
      {
        bindingMode: 'system_table',
        objectType: 'users',
      },
    );
    expect(merged.find((d) => d.fieldKey === 'name')?.canCreate).toBe(true);
    expect(merged.find((d) => d.fieldKey === 'name')?.canUpdate).toBe(true);
    expect(merged.find((d) => d.fieldKey === 'createdAt')?.canCreate).toBe(false);
    expect(merged.find((d) => d.fieldKey === 'createdAt')?.canUpdate).toBe(false);
  });

  it('marks derived runtime fields as non-writable when displayOnly is true', () => {
    const merged = mergeWriteSchemaCapabilities(
      [
        {
          fieldKey: 'displayName',
          label: 'Display name',
          fieldType: 'text',
          orderIndex: 1,
          derivedRuntimeConfig: {
            schemaVersion: 1,
            operation: 'concat',
            sourceFieldKeys: ['firstName', 'lastName'],
            displayOnly: true,
          },
        },
      ],
      {
        bindingMode: 'sor_bound',
        objectType: 'customer',
      },
    );
    const field = merged.find((d) => d.fieldKey === 'displayName');
    expect(field?.canCreate).toBe(false);
    expect(field?.canUpdate).toBe(false);
  });
});

describe('finalizeCoreFieldDescriptors', () => {
  it('returns capable standalone custom fields', () => {
    const rows = finalizeCoreFieldDescriptors({
      bindingMode: 'standalone',
      objectType: 'widget',
      fieldViews: [
        {
          field: {
            configObjectFieldId: 1,
            configObjectId: 1,
            fieldKey: 'title',
            label: 'Title',
            fieldType: 'text',
            orderIndex: 1,
            description: null,
            validationJson: null,
            defaultValue: null,
            isRequired: false,
            isSystem: false,
            sectionKey: null,
            createdBy: 1,
            updatedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as import('../entities/config_object_field.entity').ConfigObjectFieldEntity,
          rules: [],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].canCreate).toBe(true);
    expect(rows[0].canUpdate).toBe(true);
  });
});

describe('inferDtoCapabilityOverridesForObjectType', () => {
  it('derives required and writable flags from users DTOs', () => {
    const overrides = inferDtoCapabilityOverridesForObjectType('users');
    expect(overrides.email).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: true,
      requiredOnUpdate: false,
    });
    expect(overrides.userId).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: false,
      requiredOnUpdate: true,
    });
  });

  it('returns empty object when no DTO pair is registered', () => {
    expect(inferDtoCapabilityOverridesForObjectType('unknown_type')).toEqual({});
  });

  it('derives tenant_working_hours capability flags from DTOs', () => {
    const overrides =
      inferDtoCapabilityOverridesForObjectType('tenant_working_hours');
    expect(overrides.dayOfWeek).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: true,
      requiredOnUpdate: true,
    });
    expect(overrides.tenantWorkingHourId).toMatchObject({
      canCreate: false,
      canUpdate: true,
      requiredOnUpdate: true,
    });
  });

  it('derives process_instance_steps capability flags from DTOs', () => {
    const overrides =
      inferDtoCapabilityOverridesForObjectType('process_instance_steps');
    expect(overrides.processInstanceId).toMatchObject({
      canCreate: true,
      canUpdate: true,
    });
    expect(overrides.stepInstanceId).toMatchObject({
      canCreate: false,
      canUpdate: true,
    });
  });

  it('derives sor_bound project capability flags from DTOs', () => {
    const overrides = inferDtoCapabilityOverridesForObjectType('project');
    expect(overrides.name).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: true,
      requiredOnUpdate: true,
    });
    expect(overrides.projectId).toMatchObject({
      canCreate: false,
      canUpdate: true,
      requiredOnUpdate: true,
    });
  });

  it('derives sor_bound resource capability flags from DTOs', () => {
    const overrides = inferDtoCapabilityOverridesForObjectType('resource');
    expect(overrides.name).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: true,
    });
    expect(overrides.type).toMatchObject({
      canCreate: true,
      canUpdate: true,
      requiredOnCreate: true,
    });
  });

  it('covers the expanded sor_bound registry set with non-empty overrides', () => {
    const objectTypes = [
      'categories',
      'category_descriptions',
      'notifications',
      'notification_channels',
      'notification_templates',
      'notification_logs',
      'events',
      'event_logs',
      'event_listeners',
      'tenant_contact_info',
      'tenant_billing_info',
      'tenant_subscriptions',
      'tenant_teams',
      'tenant_user_invitations',
      'project_task_statuses',
      'project_step_status_mappings',
      'projects',
      'tasks',
      'customers',
      'resources',
      'customer_invitations',
      'resource_assignments',
      'resource_availability',
      'resource_blackout_dates',
      'task_comments',
      'task_attachments',
      'task_mentions',
      'user_notification_preferences',
    ];

    for (const objectType of objectTypes) {
      expect(Object.keys(inferDtoCapabilityOverridesForObjectType(objectType)).length)
        .toBeGreaterThan(0);
    }
  });
});
