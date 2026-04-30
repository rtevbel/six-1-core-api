import {
  CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION,
  CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION,
  type CoreFieldDerivedRuntimeConfig,
  type CoreFieldLookupSelectConfig,
} from '../core-field-descriptor/core-field-descriptor.runtime-metadata.types';

export class LookupSelectAuthoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LookupSelectAuthoringValidationError';
  }
}

export class DerivedRuntimeAuthoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DerivedRuntimeAuthoringValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new Error(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertRefToken(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (/^[a-z]+:\/\//i.test(trimmed)) {
    throw new Error(`${label} must be a ref token, not a URL`);
  }
  return trimmed;
}

export function validateLookupSelectAuthoringMetadata(
  value: unknown,
): CoreFieldLookupSelectConfig {
  try {
    const o = assertPlainObject(value, '_six1LookupSelectAuthoring');
    const allowed = new Set([
      'schemaVersion',
      'dataRef',
      'valueKey',
      'labelKey',
      'queryDefaults',
      'searchable',
      'multi',
    ]);
    for (const k of Object.keys(o)) {
      if (!allowed.has(k)) {
        throw new Error(`_six1LookupSelectAuthoring: unknown key "${k}"`);
      }
    }

    if (
      typeof o.schemaVersion !== 'number' ||
      !Number.isInteger(o.schemaVersion) ||
      o.schemaVersion !== CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION
    ) {
      throw new Error(
        `_six1LookupSelectAuthoring.schemaVersion must be ${CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION}`,
      );
    }
    if (typeof o.dataRef !== 'string') {
      throw new Error('_six1LookupSelectAuthoring.dataRef is required');
    }
    if (typeof o.valueKey !== 'string') {
      throw new Error('_six1LookupSelectAuthoring.valueKey is required');
    }
    if (typeof o.labelKey !== 'string') {
      throw new Error('_six1LookupSelectAuthoring.labelKey is required');
    }

    const out: CoreFieldLookupSelectConfig = {
      schemaVersion: CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION,
      dataRef: assertRefToken(o.dataRef, '_six1LookupSelectAuthoring.dataRef'),
      valueKey: assertRefToken(
        o.valueKey,
        '_six1LookupSelectAuthoring.valueKey',
      ),
      labelKey: assertRefToken(
        o.labelKey,
        '_six1LookupSelectAuthoring.labelKey',
      ),
    };

    if (o.queryDefaults !== undefined) {
      out.queryDefaults = assertPlainObject(
        o.queryDefaults,
        '_six1LookupSelectAuthoring.queryDefaults',
      );
    }
    if (o.searchable !== undefined) {
      if (typeof o.searchable !== 'boolean') {
        throw new Error('_six1LookupSelectAuthoring.searchable must be boolean');
      }
      out.searchable = o.searchable;
    }
    if (o.multi !== undefined) {
      if (typeof o.multi !== 'boolean') {
        throw new Error('_six1LookupSelectAuthoring.multi must be boolean');
      }
      out.multi = o.multi;
    }
    return out;
  } catch (error) {
    throw new LookupSelectAuthoringValidationError((error as Error).message);
  }
}

export function validateDerivedRuntimeAuthoringMetadata(
  value: unknown,
): CoreFieldDerivedRuntimeConfig {
  try {
    const o = assertPlainObject(value, '_six1DerivedRuntimeAuthoring');
    const allowed = new Set([
      'schemaVersion',
      'operation',
      'sourceFieldKeys',
      'separator',
      'nullDisplayValue',
      'trim',
    ]);
    for (const k of Object.keys(o)) {
      if (!allowed.has(k)) {
        throw new Error(`_six1DerivedRuntimeAuthoring: unknown key "${k}"`);
      }
    }
    if (
      typeof o.schemaVersion !== 'number' ||
      !Number.isInteger(o.schemaVersion) ||
      o.schemaVersion !== CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION
    ) {
      throw new Error(
        `_six1DerivedRuntimeAuthoring.schemaVersion must be ${CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION}`,
      );
    }
    if (o.operation !== 'concat' && o.operation !== 'coalesce') {
      throw new Error(
        '_six1DerivedRuntimeAuthoring.operation must be concat or coalesce',
      );
    }
    if (!Array.isArray(o.sourceFieldKeys) || o.sourceFieldKeys.length === 0) {
      throw new Error(
        '_six1DerivedRuntimeAuthoring.sourceFieldKeys must be a non-empty string array',
      );
    }
    const sourceFieldKeys = o.sourceFieldKeys.map((item, idx) => {
      if (typeof item !== 'string' || !item.trim()) {
        throw new Error(
          `_six1DerivedRuntimeAuthoring.sourceFieldKeys[${idx}] must be a non-empty string`,
        );
      }
      return item.trim();
    });

    const out: CoreFieldDerivedRuntimeConfig = {
      schemaVersion: CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION,
      operation: o.operation,
      sourceFieldKeys,
    };
    if (o.separator !== undefined) {
      if (typeof o.separator !== 'string') {
        throw new Error('_six1DerivedRuntimeAuthoring.separator must be a string');
      }
      out.separator = o.separator;
    }
    if (o.nullDisplayValue !== undefined) {
      if (typeof o.nullDisplayValue !== 'string') {
        throw new Error(
          '_six1DerivedRuntimeAuthoring.nullDisplayValue must be a string',
        );
      }
      out.nullDisplayValue = o.nullDisplayValue;
    }
    if (o.trim !== undefined) {
      if (typeof o.trim !== 'boolean') {
        throw new Error('_six1DerivedRuntimeAuthoring.trim must be boolean');
      }
      out.trim = o.trim;
    }
    return out;
  } catch (error) {
    throw new DerivedRuntimeAuthoringValidationError((error as Error).message);
  }
}
