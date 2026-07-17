import {
  validateFieldValidationJson,
  isValidFileFieldValue,
  normalizeMediaRef,
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

  it('validates top-level accept, maxSizeBytes, maxFiles', () => {
    expect(
      validateFieldValidationJson({
        accept: '.pdf,image/*',
        maxSizeBytes: 5_000_000,
        maxFiles: 3,
      }),
    ).toEqual({
      schemaVersion: 1,
      accept: '.pdf,image/*',
      maxSizeBytes: 5_000_000,
      maxFiles: 3,
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

describe('isValidFileFieldValue / normalizeMediaRef', () => {
  it('accepts canonical path ref', () => {
    expect(
      isValidFileFieldValue({
        path: 'tenant/42/invoice/attachments/abc.pdf',
        filename: 'abc.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
      }),
    ).toBe(true);
  });

  it('accepts legacy key and normalizes to path', () => {
    expect(
      isValidFileFieldValue({
        key: 'uploads/abc.pdf',
        filename: 'abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
      }),
    ).toBe(true);
    expect(
      normalizeMediaRef({
        key: 'uploads/abc.pdf',
        mimeType: 'application/pdf',
      }),
    ).toEqual({
      path: 'uploads/abc.pdf',
      contentType: 'application/pdf',
    });
  });

  it('rejects missing path and key', () => {
    expect(isValidFileFieldValue({ filename: 'x' })).toBe(false);
  });
});
