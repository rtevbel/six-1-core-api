import type { ConfigObjectFieldEntity } from '../entities/config_object_field.entity';
import type { ConfigObjectFieldRuleEntity } from '../entities/config_object_field_rule.entity';
import type { ConfigObjectFieldView } from '../interfaces/config-object-resolved-instance.interface';

import {
  buildMergedCoreFieldDescriptors,
  mergeCoreFieldDescriptorsWithFieldViews,
  normalizeCustomFieldType,
} from './core-field-descriptor.merge';
import { generateBaseCoreFieldDescriptorsFromSorRegistry } from './core-field-descriptor.generator';

function fieldStub(
  overrides: Partial<ConfigObjectFieldEntity> &
    Pick<
      ConfigObjectFieldEntity,
      'fieldKey' | 'label' | 'fieldType' | 'orderIndex'
    >,
): ConfigObjectFieldEntity {
  return {
    configObjectFieldId: overrides.configObjectFieldId ?? 1,
    configObjectId: overrides.configObjectId ?? 1,
    description: overrides.description ?? null,
    validationJson: null,
    defaultValue: null,
    isRequired: overrides.isRequired ?? false,
    isSystem: overrides.isSystem ?? false,
    sectionKey: overrides.sectionKey ?? null,
    createdBy: overrides.createdBy ?? 1,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ConfigObjectFieldEntity;
}

function ruleStub(
  overrides: Partial<ConfigObjectFieldRuleEntity> &
    Pick<ConfigObjectFieldRuleEntity, 'configObjectFieldId'>,
): ConfigObjectFieldRuleEntity {
  return {
    configObjectFieldRuleId: overrides.configObjectFieldRuleId ?? 1,
    lifecycleStateKey: overrides.lifecycleStateKey ?? null,
    roleKey: overrides.roleKey ?? null,
    isVisible: overrides.isVisible ?? true,
    isReadonly: overrides.isReadonly ?? false,
    isRequired: overrides.isRequired ?? false,
    rulesJson: null,
    ...overrides,
  } as ConfigObjectFieldRuleEntity;
}

function viewOf(
  field: ConfigObjectFieldEntity,
  rules: ConfigObjectFieldRuleEntity[] = [],
): ConfigObjectFieldView {
  return {
    field,
    rules: rules.map((fieldRule) => ({ fieldRule })),
  };
}

describe('normalizeCustomFieldType', () => {
  it('maps aliases and falls back to text', () => {
    expect(normalizeCustomFieldType('string')).toBe('text');
    expect(normalizeCustomFieldType('TEXT')).toBe('text');
    expect(normalizeCustomFieldType('number')).toBe('number');
    expect(normalizeCustomFieldType('unknown_xyz')).toBe('text');
  });
});

describe('mergeCoreFieldDescriptorsWithFieldViews', () => {
  it('returns base unchanged when no field views', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    const merged = mergeCoreFieldDescriptorsWithFieldViews(base, []);
    expect(merged).toEqual(base);
  });

  it('overrides SoR label and order from config_object_fields row', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    const nameRow = fieldStub({
      fieldKey: 'name',
      label: 'Project title',
      fieldType: 'text',
      orderIndex: 500,
      sectionKey: 'main',
    });
    const merged = mergeCoreFieldDescriptorsWithFieldViews(base, [
      viewOf(nameRow),
    ]);
    const nameDesc = merged.find((d) => d.fieldKey === 'name');
    expect(nameDesc?.label).toBe('Project title');
    expect(nameDesc?.orderIndex).toBe(500);
    expect(nameDesc?.sectionKey).toBe('main');
  });

  it('appends custom-only fields after SoR block', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('task');
    const custom = fieldStub({
      configObjectFieldId: 2,
      fieldKey: 'custom_note',
      label: 'Note',
      fieldType: 'textarea',
      orderIndex: 5,
      sectionKey: null,
    });
    const merged = mergeCoreFieldDescriptorsWithFieldViews(base, [
      viewOf(custom),
    ]);
    const keys = merged.map((m) => m.fieldKey);
    expect(keys.indexOf('custom_note')).toBeGreaterThan(keys.indexOf('name'));
    const note = merged.find((d) => d.fieldKey === 'custom_note');
    expect(note?.fieldType).toBe('textarea');
  });

  it('applies global default rules as readOnly on SoR field', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    const nameRow = fieldStub({
      fieldKey: 'name',
      label: 'Name',
      fieldType: 'text',
      orderIndex: 10,
    });
    const rule = ruleStub({
      configObjectFieldId: nameRow.configObjectFieldId,
      isReadonly: true,
    });
    const merged = mergeCoreFieldDescriptorsWithFieldViews(base, [
      viewOf(nameRow, [rule]),
    ]);
    expect(merged.find((d) => d.fieldKey === 'name')?.readOnly).toBe(true);
  });

  it('maps lookup and derived runtime metadata from validationJson', () => {
    const base = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    const nameRow = fieldStub({
      fieldKey: 'name',
      label: 'Project Name',
      fieldType: 'text',
      orderIndex: 10,
      validationJson: {
        _six1LookupSelectAuthoring: {
          schemaVersion: 1,
          dataRef: 'core.system_statuses.list',
          valueKey: 'statusId',
          labelKey: 'name',
        },
        _six1DerivedRuntimeAuthoring: {
          schemaVersion: 1,
          operation: 'concat',
          sourceFieldKeys: ['groupName', 'name'],
          separator: ' - ',
        },
      },
    });
    const merged = mergeCoreFieldDescriptorsWithFieldViews(base, [
      viewOf(nameRow),
    ]);
    const nameDesc = merged.find((d) => d.fieldKey === 'name');
    expect(nameDesc?.lookupSelectConfig).toEqual({
      schemaVersion: 1,
      dataRef: 'core.system_statuses.list',
      valueKey: 'statusId',
      labelKey: 'name',
    });
    expect(nameDesc?.derivedRuntimeConfig).toEqual({
      schemaVersion: 1,
      operation: 'concat',
      sourceFieldKeys: ['groupName', 'name'],
      separator: ' - ',
    });
  });
});

describe('buildMergedCoreFieldDescriptors', () => {
  it('returns only custom fields for standalone binding', () => {
    const custom = fieldStub({
      fieldKey: 'title',
      label: 'Title',
      fieldType: 'text',
      orderIndex: 1,
    });
    const rows = buildMergedCoreFieldDescriptors({
      bindingMode: 'standalone',
      objectType: 'my_widget',
      fieldViews: [viewOf(custom)],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].fieldKey).toBe('title');
  });

  it('returns metadata-backed descriptors for system_table with no custom fields', () => {
    const rows = buildMergedCoreFieldDescriptors({
      bindingMode: 'system_table',
      objectType: 'tenant_teams',
      fieldViews: [],
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.fieldKey === 'tenantTeamId')).toBe(true);
  });
});
