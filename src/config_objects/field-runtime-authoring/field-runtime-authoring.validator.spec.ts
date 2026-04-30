import {
  DerivedRuntimeAuthoringValidationError,
  LookupSelectAuthoringValidationError,
  validateDerivedRuntimeAuthoringMetadata,
  validateLookupSelectAuthoringMetadata,
} from './field-runtime-authoring.validator';

describe('validateLookupSelectAuthoringMetadata', () => {
  it('normalizes and accepts valid lookup select metadata', () => {
    expect(
      validateLookupSelectAuthoringMetadata({
        schemaVersion: 1,
        dataRef: ' core.languages.list ',
        valueKey: ' languageId ',
        labelKey: ' name ',
        searchable: true,
      }),
    ).toEqual({
      schemaVersion: 1,
      dataRef: 'core.languages.list',
      valueKey: 'languageId',
      labelKey: 'name',
      searchable: true,
    });
  });

  it('rejects URL refs for dataRef', () => {
    expect(() =>
      validateLookupSelectAuthoringMetadata({
        schemaVersion: 1,
        dataRef: 'https://example.com/status',
        valueKey: 'statusId',
        labelKey: 'name',
      }),
    ).toThrow(LookupSelectAuthoringValidationError);
  });
});

describe('validateDerivedRuntimeAuthoringMetadata', () => {
  it('accepts valid concat metadata', () => {
    expect(
      validateDerivedRuntimeAuthoringMetadata({
        schemaVersion: 1,
        operation: 'concat',
        sourceFieldKeys: ['firstName', 'lastName'],
        separator: ' ',
        trim: true,
      }),
    ).toEqual({
      schemaVersion: 1,
      operation: 'concat',
      sourceFieldKeys: ['firstName', 'lastName'],
      separator: ' ',
      trim: true,
    });
  });

  it('rejects empty sourceFieldKeys', () => {
    expect(() =>
      validateDerivedRuntimeAuthoringMetadata({
        schemaVersion: 1,
        operation: 'coalesce',
        sourceFieldKeys: [],
      }),
    ).toThrow(DerivedRuntimeAuthoringValidationError);
  });
});
