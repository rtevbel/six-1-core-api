import {
  buildCoreOnlyFieldSnapshot,
  buildCompletenessFieldSnapshot,
  buildMergedFieldSnapshot,
} from './config-object-completeness-fields.util';

describe('config-object-completeness-fields.util', () => {
  it('buildCoreOnlyFieldSnapshot uses entity metadata for system_table tenant', () => {
    const fields = buildCoreOnlyFieldSnapshot('tenant', {
      tenantId: 7,
      name: 'Acme',
      userId: 99,
    });
    expect(fields.name).toBe('Acme');
    expect(fields.tenantId).toBe(7);
    expect(fields.userId).toBe(99);
  });

  it('buildCompletenessFieldSnapshot uses core-only fields for system_table', () => {
    const fields = buildCompletenessFieldSnapshot('system_table', {
      objectType: 'customer',
      core: {
        customerId: 1,
        firstName: 'Ada',
        customMeta: 'ignored',
      },
    });
    expect(fields.firstName).toBe('Ada');
    expect(fields.customMeta).toBeUndefined();
  });

  it('buildMergedFieldSnapshot merges sor and custom fields for sor_bound', () => {
    const fields = buildMergedFieldSnapshot({
      resolutionMode: 'sor_bound',
      objectType: 'customer',
      coreId: 1,
      tenantId: 1,
      schema: {
        fieldRegistry: [
          { fieldKey: 'firstName', label: 'First' },
          { fieldKey: 'nickname', label: 'Nick' },
        ],
        mergedFieldOrder: [
          { source: 'sor', fieldKey: 'firstName' },
          { source: 'custom', fieldKey: 'nickname', configObjectFieldId: 2 },
        ],
      } as never,
      core: { customerId: 1, firstName: 'Ada' },
      dynamicFields: { nickname: 'Ace' },
      sections: [],
    });
    expect(fields).toEqual({ firstName: 'Ada', nickname: 'Ace' });
  });
});
