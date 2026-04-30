import {
  CoreFieldDescriptorValidationError,
  validateCoreFieldDescriptor,
  validateCoreFieldDescriptors,
} from './core-field-descriptor.validator';

describe('validateCoreFieldDescriptor', () => {
  const validMinimal = {
    fieldKey: 'name',
    label: 'Name',
    fieldType: 'text',
    orderIndex: 10,
  };

  it('accepts a minimal valid descriptor', () => {
    const result = validateCoreFieldDescriptor(validMinimal);
    expect(result).toEqual(validMinimal);
  });

  it('accepts optional capability and path fields', () => {
    const result = validateCoreFieldDescriptor({
      ...validMinimal,
      readOnly: true,
      canCreate: false,
      canUpdate: true,
      requiredOnCreate: true,
      requiredOnUpdate: false,
      path: 'roleDescriptions[0].name',
    });
    expect(result.canCreate).toBe(false);
    expect(result.path).toBe('roleDescriptions[0].name');
  });

  it('accepts lookup and derived runtime metadata blocks', () => {
    const result = validateCoreFieldDescriptor({
      ...validMinimal,
      lookupSelectConfig: {
        schemaVersion: 1,
        dataRef: 'core.system_statuses.list',
        valueKey: 'statusId',
        labelKey: 'name',
      },
      derivedRuntimeConfig: {
        schemaVersion: 1,
        operation: 'concat',
        sourceFieldKeys: ['firstName', 'lastName'],
        separator: ' ',
      },
    });
    expect(result.lookupSelectConfig).toBeDefined();
    expect(result.derivedRuntimeConfig).toBeDefined();
  });

  it('strips unknown properties', () => {
    const result = validateCoreFieldDescriptor({
      ...validMinimal,
      extraVendorKey: 'drop-me',
    } as Record<string, unknown>);
    expect(
      (result as unknown as Record<string, unknown>).extraVendorKey,
    ).toBeUndefined();
  });

  it('rejects invalid fieldType', () => {
    expect(() =>
      validateCoreFieldDescriptor({
        ...validMinimal,
        fieldType: 'unknown-type',
      }),
    ).toThrow(CoreFieldDescriptorValidationError);
  });

  it('rejects missing fieldKey', () => {
    expect(() =>
      validateCoreFieldDescriptor({
        label: 'Name',
        fieldType: 'text',
        orderIndex: 0,
      }),
    ).toThrow(CoreFieldDescriptorValidationError);
  });

  it('rejects negative orderIndex', () => {
    expect(() =>
      validateCoreFieldDescriptor({
        ...validMinimal,
        orderIndex: -1,
      }),
    ).toThrow(CoreFieldDescriptorValidationError);
  });
});

describe('validateCoreFieldDescriptors', () => {
  it('maps a valid array', () => {
    const out = validateCoreFieldDescriptors([
      { fieldKey: 'a', label: 'A', fieldType: 'text', orderIndex: 0 },
      { fieldKey: 'b', label: 'B', fieldType: 'number', orderIndex: 1 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].fieldKey).toBe('a');
  });

  it('rejects non-array input', () => {
    expect(() => validateCoreFieldDescriptors({} as unknown[])).toThrow(
      CoreFieldDescriptorValidationError,
    );
  });
});
