import {
  DerivedDisplayAuthoringValidationError,
  validateDerivedDisplayAuthoringMetadata,
} from './derived-display-authoring.validator';

describe('validateDerivedDisplayAuthoringMetadata', () => {
  it('normalizes empty object to schema v1', () => {
    expect(validateDerivedDisplayAuthoringMetadata({})).toEqual({
      schemaVersion: 1,
    });
  });

  it('accepts languageFallbackChain', () => {
    expect(
      validateDerivedDisplayAuthoringMetadata({
        schemaVersion: 1,
        languageFallbackChain: [' en ', 'fr'],
      }),
    ).toEqual({
      schemaVersion: 1,
      languageFallbackChain: ['en', 'fr'],
    });
  });

  it('rejects unknown keys', () => {
    expect(() =>
      validateDerivedDisplayAuthoringMetadata({
        schemaVersion: 1,
        extra: true,
      }),
    ).toThrow(DerivedDisplayAuthoringValidationError);
  });
});
