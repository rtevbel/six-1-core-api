import {
  FIELD_VALIDATION_SCHEMA_VERSION,
  MEDIA_PATH_MAX_LENGTH,
  type FieldValidationFileConstraints,
  type FieldValidationJson,
  type MediaRef,
} from './field-validation.types';

export class FieldValidationJsonValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldValidationJsonValidationError';
  }
}

const STANDARD_VALIDATION_KEYS = new Set([
  'schemaVersion',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
  'file',
  'accept',
  'maxSizeBytes',
  'maxFiles',
]);

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new FieldValidationJsonValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new FieldValidationJsonValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertNonNegativeInteger(
  value: unknown,
  label: string,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new FieldValidationJsonValidationError(
      `${label} must be a non-negative integer`,
    );
  }
  return value;
}

function assertPositiveInteger(value: unknown, label: string): number {
  const n = assertNonNegativeInteger(value, label);
  if (n === 0) {
    throw new FieldValidationJsonValidationError(`${label} must be greater than 0`);
  }
  return n;
}

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new FieldValidationJsonValidationError(`${label} must be a finite number`);
  }
  return value;
}

function validateFileConstraints(
  raw: unknown,
  label: string,
): FieldValidationFileConstraints {
  const o = assertPlainObject(raw, label);
  const allowed = new Set(['maxSizeBytes', 'allowedMimeTypes']);
  for (const key of Object.keys(o)) {
    if (!allowed.has(key)) {
      throw new FieldValidationJsonValidationError(`${label}: unknown key "${key}"`);
    }
  }

  const out: FieldValidationFileConstraints = {};

  if (Object.prototype.hasOwnProperty.call(o, 'maxSizeBytes')) {
    out.maxSizeBytes = assertPositiveInteger(o.maxSizeBytes, `${label}.maxSizeBytes`);
  }

  if (Object.prototype.hasOwnProperty.call(o, 'allowedMimeTypes')) {
    if (!Array.isArray(o.allowedMimeTypes)) {
      throw new FieldValidationJsonValidationError(
        `${label}.allowedMimeTypes must be an array`,
      );
    }
    const mimeTypes = o.allowedMimeTypes.map((item, index) => {
      if (typeof item !== 'string' || !item.trim()) {
        throw new FieldValidationJsonValidationError(
          `${label}.allowedMimeTypes[${index}] must be a non-empty string`,
        );
      }
      return item.trim();
    });
    if (mimeTypes.length === 0) {
      throw new FieldValidationJsonValidationError(
        `${label}.allowedMimeTypes must not be empty`,
      );
    }
    out.allowedMimeTypes = mimeTypes;
  }

  if (Object.keys(out).length === 0) {
    throw new FieldValidationJsonValidationError(
      `${label} must include maxSizeBytes and/or allowedMimeTypes`,
    );
  }

  return out;
}

function validatePattern(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new FieldValidationJsonValidationError(`${label} must be a non-empty string`);
  }
  try {
    // eslint-disable-next-line no-new
    new RegExp(value);
  } catch {
    throw new FieldValidationJsonValidationError(`${label} must be a valid regex`);
  }
  return value;
}

/**
 * Validates standard `validationJson` constraint keys on field save.
 * Preserves `_six1*` authoring keys (validated elsewhere).
 */
export function validateFieldValidationJson(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let hasStandardConstraints = false;

  for (const [key, raw] of Object.entries(value)) {
    if (key.startsWith('_six1')) {
      out[key] = raw;
      continue;
    }

    if (!STANDARD_VALIDATION_KEYS.has(key)) {
      throw new FieldValidationJsonValidationError(
        `validationJson: unknown key "${key}"`,
      );
    }

    switch (key) {
      case 'schemaVersion': {
        if (
          typeof raw !== 'number' ||
          !Number.isInteger(raw) ||
          raw !== FIELD_VALIDATION_SCHEMA_VERSION
        ) {
          throw new FieldValidationJsonValidationError(
            `validationJson.schemaVersion must be ${FIELD_VALIDATION_SCHEMA_VERSION}`,
          );
        }
        out.schemaVersion = FIELD_VALIDATION_SCHEMA_VERSION;
        break;
      }
      case 'minLength':
        out.minLength = assertNonNegativeInteger(raw, 'validationJson.minLength');
        hasStandardConstraints = true;
        break;
      case 'maxLength':
        out.maxLength = assertNonNegativeInteger(raw, 'validationJson.maxLength');
        hasStandardConstraints = true;
        break;
      case 'min':
        out.min = assertFiniteNumber(raw, 'validationJson.min');
        hasStandardConstraints = true;
        break;
      case 'max':
        out.max = assertFiniteNumber(raw, 'validationJson.max');
        hasStandardConstraints = true;
        break;
      case 'pattern':
        out.pattern = validatePattern(raw, 'validationJson.pattern');
        hasStandardConstraints = true;
        break;
      case 'file':
        out.file = validateFileConstraints(raw, 'validationJson.file');
        hasStandardConstraints = true;
        break;
      case 'accept': {
        if (typeof raw !== 'string' || !raw.trim()) {
          throw new FieldValidationJsonValidationError(
            'validationJson.accept must be a non-empty string',
          );
        }
        out.accept = raw.trim();
        hasStandardConstraints = true;
        break;
      }
      case 'maxSizeBytes':
        out.maxSizeBytes = assertPositiveInteger(raw, 'validationJson.maxSizeBytes');
        hasStandardConstraints = true;
        break;
      case 'maxFiles':
        out.maxFiles = assertPositiveInteger(raw, 'validationJson.maxFiles');
        hasStandardConstraints = true;
        break;
      default:
        break;
    }
  }

  const minLength = out.minLength as number | undefined;
  const maxLength = out.maxLength as number | undefined;
  if (
    minLength !== undefined &&
    maxLength !== undefined &&
    minLength > maxLength
  ) {
    throw new FieldValidationJsonValidationError(
      'validationJson.minLength must be <= maxLength',
    );
  }

  const min = out.min as number | undefined;
  const max = out.max as number | undefined;
  if (min !== undefined && max !== undefined && min > max) {
    throw new FieldValidationJsonValidationError(
      'validationJson.min must be <= max',
    );
  }

  if (hasStandardConstraints && out.schemaVersion === undefined) {
    out.schemaVersion = FIELD_VALIDATION_SCHEMA_VERSION;
  }

  return out;
}

/**
 * Normalize a single media ref: prefer `path`, accept legacy `key`.
 */
export function normalizeMediaRef(value: unknown): MediaRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const v = value as Record<string, unknown>;
  const pathRaw =
    typeof v.path === 'string' && v.path.trim()
      ? v.path.trim()
      : typeof v.key === 'string' && v.key.trim()
        ? v.key.trim()
        : null;
  if (!pathRaw || pathRaw.length > MEDIA_PATH_MAX_LENGTH) {
    return null;
  }

  const contentType =
    typeof v.contentType === 'string'
      ? v.contentType
      : typeof v.mimeType === 'string'
        ? v.mimeType
        : undefined;

  const out: MediaRef = { path: pathRaw };
  if (typeof v.filename === 'string') {
    out.filename = v.filename;
  }
  if (contentType !== undefined) {
    out.contentType = contentType;
  }
  if (
    typeof v.sizeBytes === 'number' &&
    Number.isInteger(v.sizeBytes) &&
    v.sizeBytes >= 0
  ) {
    out.sizeBytes = v.sizeBytes;
  }
  return out;
}

/**
 * Type guard for file/attachment field values (single MediaRef).
 * Accepts legacy `{ key }` and canonical `{ path }`.
 */
export function isValidFileFieldValue(value: unknown): value is MediaRef {
  return normalizeMediaRef(value) !== null;
}

/**
 * True when value is a single MediaRef or a non-empty array of MediaRefs.
 */
export function isValidMediaFieldValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((item) => isValidFileFieldValue(item));
  }
  return isValidFileFieldValue(value);
}

export type { FieldValidationJson };
