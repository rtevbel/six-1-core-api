import {
  generateBaseCoreFieldDescriptors,
  generateBaseCoreFieldDescriptorsFromEntityMetadata,
  generateBaseCoreFieldDescriptorsFromSorRegistry,
  mapSorFieldDescriptorToCore,
} from './core-field-descriptor.generator';

describe('mapSorFieldDescriptorToCore', () => {
  it('maps required Sor fields and preserves readOnly', () => {
    const core = mapSorFieldDescriptorToCore({
      fieldKey: 'projectId',
      label: 'Project ID',
      fieldType: 'number',
      orderIndex: 0,
      readOnly: true,
    });
    expect(core).toMatchObject({
      fieldKey: 'projectId',
      label: 'Project ID',
      fieldType: 'number',
      orderIndex: 0,
      readOnly: true,
    });
    expect(core.canCreate).toBeUndefined();
  });
});

describe('generateBaseCoreFieldDescriptorsFromSorRegistry', () => {
  it('returns sorted descriptors for project', () => {
    const rows = generateBaseCoreFieldDescriptorsFromSorRegistry('project');
    expect(rows.length).toBeGreaterThan(0);
    const keys = rows.map((r) => r.fieldKey);
    expect(keys).toContain('name');
    expect(keys).toContain('projectId');
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].orderIndex).toBeGreaterThanOrEqual(rows[i - 1].orderIndex);
    }
  });

  it('returns empty array for unknown object types', () => {
    expect(generateBaseCoreFieldDescriptorsFromSorRegistry('unknown_type')).toEqual(
      [],
    );
  });
});

describe('generateBaseCoreFieldDescriptors', () => {
  it('builds sor_bound descriptors from entity metadata', () => {
    const rows = generateBaseCoreFieldDescriptors({
      bindingMode: 'sor_bound',
      objectType: 'task',
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.fieldKey === 'taskId')).toBe(true);
  });

  it('falls back to entity metadata aliases for sor_bound object types', () => {
    const rows = generateBaseCoreFieldDescriptors({
      bindingMode: 'sor_bound',
      objectType: 'projects',
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.fieldKey === 'name')).toBe(true);
  });

  it('falls back to SoR registry when sor_bound object type is not in entity registry', () => {
    const rows = generateBaseCoreFieldDescriptors({
      bindingMode: 'sor_bound',
      objectType: 'unknown_type',
    });
    expect(rows).toEqual([]);
  });

  it('builds system_table descriptors from entity metadata', () => {
    const rows = generateBaseCoreFieldDescriptors({
      bindingMode: 'system_table',
      objectType: 'users',
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.fieldKey === 'email')).toBe(true);
  });

  it('returns empty for standalone (custom fields merged elsewhere)', () => {
    expect(
      generateBaseCoreFieldDescriptors({
        bindingMode: 'standalone',
        objectType: 'custom_widget',
      }),
    ).toEqual([]);
  });
});

describe('generateBaseCoreFieldDescriptorsFromEntityMetadata', () => {
  it('returns empty when objectType has no mapped entity', () => {
    expect(
      generateBaseCoreFieldDescriptorsFromEntityMetadata('unknown_system_type'),
    ).toEqual([]);
  });
});
