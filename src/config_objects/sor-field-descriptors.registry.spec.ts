import {
  buildMergedFieldOrder,
  getSorFieldDescriptors,
  getWritableSorFieldKeys,
} from './sor-field-descriptors.registry';

describe('sor-field-descriptors.registry', () => {
  it('buildMergedFieldOrder places SoR fields before custom fields', () => {
    const merged = buildMergedFieldOrder('project', [
      {
        configObjectFieldId: 99,
        fieldKey: 'custom_a',
        orderIndex: 5,
        sectionKey: 'extra',
      },
      {
        configObjectFieldId: 100,
        fieldKey: 'custom_b',
        orderIndex: 1,
        sectionKey: 'extra',
      },
    ]);

    const firstCustomIdx = merged.findIndex((e) => e.source === 'custom');
    const lastSorIdx = merged.map((e) => e.source).lastIndexOf('sor');
    expect(lastSorIdx).toBeLessThan(firstCustomIdx);
    expect(merged.filter((e) => e.source === 'custom').map((e) => e.fieldKey)).toEqual([
      'custom_b',
      'custom_a',
    ]);
  });

  it('getWritableSorFieldKeys excludes readOnly descriptors', () => {
    const keys = getWritableSorFieldKeys('project');
    expect(keys.has('name')).toBe(true);
    expect(keys.has('tenantId')).toBe(false);
    expect(keys.has('projectId')).toBe(false);
  });

  it('getSorFieldDescriptors returns empty for unknown object types', () => {
    expect(getSorFieldDescriptors('unknown_type')).toEqual([]);
  });
});
