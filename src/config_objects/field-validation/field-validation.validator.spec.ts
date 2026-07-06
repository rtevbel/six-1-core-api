import {
  validateFieldValidationJson,
  isValidFileFieldValue,
  FieldValidationJsonValidationError,
} from './field-validation.validator';

describe('validateFieldValidationJson', () => {
  it('validates standard constraints and preserves _six1 keys', () => {
    expect(
      validateFieldValidationJson({
        minLength: 2,
        maxLength: 10,
        pattern: '^[a-z]+$',
        _six1LookupSelectAuthoring: { keep: true },
      }),
    ).toEqual({
      schemaVersion: 1,
      minLength: 2,
      maxLength: 10,
      pattern: '^[a-z]+$',
      _six1LookupSelectAuthoring: { keep: true },
    });
  });

  it('validates file constraints', () => {
    expect(
      validateFieldValidationJson({
        file: {
          maxSizeBytes: 1024,
          allowedMimeTypes: ['image/png', 'image/jpeg'],
        },
      }),
    ).toEqual({
      schemaVersion: 1,
      file: {
        maxSizeBytes: 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg'],
      },
    });
  });

  it('rejects minLength > maxLength', () => {
    expect(() =>
      validateFieldValidationJson({ minLength: 10, maxLength: 2 }),
    ).toThrow(FieldValidationJsonValidationError);
  });

  it('rejects unknown keys', () => {
    expect(() => validateFieldValidationJson({ foo: 1 })).toThrow(
      FieldValidationJsonValidationError,
    );
  });
});

describe('isValidFileFieldValue', () => {
  it('accepts storage ref with optional metadata', () => {
    expect(
      isValidFileFieldValue({
        key: 'uploads/abc.pdf',
        filename: 'abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
      }),
    ).toBe(true);
  });

  it('rejects missing key', () => {
    expect(isValidFileFieldValue({ filename: 'x' })).toBe(false);
  });
});
