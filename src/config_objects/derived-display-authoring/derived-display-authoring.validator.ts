/**
 * X-derived: optional `_six1DerivedDisplayAuthoring` inside `config_object_fields.validation_json`.
 * Language fallback chain for display labels sourced from related rows.
 */

export class DerivedDisplayAuthoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DerivedDisplayAuthoringValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new DerivedDisplayAuthoringValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DerivedDisplayAuthoringValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

const DERIVED_DISPLAY_SCHEMA_VERSION = 1 as const;

/**
 * Validates authoring metadata; returns a normalized object safe to persist under
 * `validation_json._six1DerivedDisplayAuthoring`.
 */
export function validateDerivedDisplayAuthoringMetadata(
  value: unknown,
): Record<string, unknown> {
  const o = assertPlainObject(value, '_six1DerivedDisplayAuthoring');
  const allowed = new Set(['schemaVersion', 'languageFallbackChain']);
  for (const k of Object.keys(o)) {
    if (!allowed.has(k)) {
      throw new DerivedDisplayAuthoringValidationError(
        `_six1DerivedDisplayAuthoring: unknown key "${k}"`,
      );
    }
  }
  const rawVersion = o.schemaVersion;
  if (rawVersion === undefined || rawVersion === null) {
    if (Object.keys(o).length === 0) {
      return { schemaVersion: DERIVED_DISPLAY_SCHEMA_VERSION };
    }
    throw new DerivedDisplayAuthoringValidationError(
      '_six1DerivedDisplayAuthoring.schemaVersion is required when metadata is non-empty',
    );
  }
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion)) {
    throw new DerivedDisplayAuthoringValidationError(
      '_six1DerivedDisplayAuthoring.schemaVersion must be an integer',
    );
  }
  if (rawVersion !== DERIVED_DISPLAY_SCHEMA_VERSION) {
    throw new DerivedDisplayAuthoringValidationError(
      `Unsupported derived-display schemaVersion ${rawVersion}; expected ${DERIVED_DISPLAY_SCHEMA_VERSION}`,
    );
  }
  const out: Record<string, unknown> = {
    schemaVersion: DERIVED_DISPLAY_SCHEMA_VERSION,
  };
  const chain = o.languageFallbackChain;
  if (chain !== undefined && chain !== null) {
    if (!Array.isArray(chain) || !chain.length) {
      throw new DerivedDisplayAuthoringValidationError(
        'languageFallbackChain must be a non-empty string array when set',
      );
    }
    for (const [i, el] of chain.entries()) {
      if (typeof el !== 'string' || !el.trim()) {
        throw new DerivedDisplayAuthoringValidationError(
          `languageFallbackChain[${i}] must be a non-empty string`,
        );
      }
    }
    out.languageFallbackChain = (chain as string[]).map((s) => s.trim());
  }
  return out;
}
