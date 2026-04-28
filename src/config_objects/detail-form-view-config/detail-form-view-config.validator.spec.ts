import {
  DetailFormViewConfigValidationError,
  validateAndNormalizeDetailFormViewConfigJson,
} from './detail-form-view-config.validator';

describe('validateAndNormalizeDetailFormViewConfigJson', () => {
  it('returns null for null or undefined', () => {
    expect(validateAndNormalizeDetailFormViewConfigJson(null)).toBeNull();
    expect(validateAndNormalizeDetailFormViewConfigJson(undefined)).toBeNull();
  });

  it('normalizes empty object to schema v1 with empty panels', () => {
    const out = validateAndNormalizeDetailFormViewConfigJson({});
    expect(out).toEqual({ schemaVersion: 1, panels: [] });
  });

  it('accepts ordered panels', () => {
    const out = validateAndNormalizeDetailFormViewConfigJson({
      schemaVersion: 1,
      panels: ['header', 'body'],
    });
    expect(out?.panels).toEqual(['header', 'body']);
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      validateAndNormalizeDetailFormViewConfigJson({
        schemaVersion: 1,
        panels: [],
        extra: 1,
      }),
    ).toThrow(DetailFormViewConfigValidationError);
  });

  it('rejects duplicate panel keys', () => {
    expect(() =>
      validateAndNormalizeDetailFormViewConfigJson({
        schemaVersion: 1,
        panels: ['a', 'a'],
      }),
    ).toThrow(/duplicates panel key/);
  });
});
