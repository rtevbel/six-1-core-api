import {
  DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION,
  DETAIL_FORM_VIEW_CONFIG_TOP_LEVEL_KEYS,
} from './detail-form-view-config.constants';
import type { DetailFormViewConfig } from './detail-form-view-config.types';

/**
 * Thrown when `detail` / `form` view `config_json` fails schema validation (authoring save).
 */
export class DetailFormViewConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DetailFormViewConfigValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new DetailFormViewConfigValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DetailFormViewConfigValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

/**
 * Validates and normalizes `detail` / `form` view `config_json` for v1.
 * Returns `null` when input is `null` or `undefined` (caller persists SQL NULL).
 */
export function validateAndNormalizeDetailFormViewConfigJson(
  value: unknown | null | undefined,
): DetailFormViewConfig | null {
  if (value === null || value === undefined) {
    return null;
  }

  const obj = assertPlainObject(value, 'detail/form config_json');

  const allowedTop = DETAIL_FORM_VIEW_CONFIG_TOP_LEVEL_KEYS as readonly string[];
  for (const key of Object.keys(obj)) {
    if (!allowedTop.includes(key)) {
      throw new DetailFormViewConfigValidationError(
        `Unknown top-level key "${key}". Allowed: ${DETAIL_FORM_VIEW_CONFIG_TOP_LEVEL_KEYS.join(', ')}`,
      );
    }
  }

  const rawVersion = obj.schemaVersion;
  if (rawVersion === undefined || rawVersion === null) {
    if (Object.keys(obj).length === 0) {
      return {
        schemaVersion: DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION,
        panels: [],
      };
    }
    throw new DetailFormViewConfigValidationError(
      'schemaVersion is required when config is non-empty',
    );
  }
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion)) {
    throw new DetailFormViewConfigValidationError('schemaVersion must be an integer');
  }
  if (rawVersion !== DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION) {
    throw new DetailFormViewConfigValidationError(
      `Unsupported schemaVersion ${rawVersion}; expected ${DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION}`,
    );
  }

  const panelsRaw = obj.panels;
  if (panelsRaw === undefined || panelsRaw === null) {
    return {
      schemaVersion: DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION,
      panels: [],
    };
  }
  if (!Array.isArray(panelsRaw)) {
    throw new DetailFormViewConfigValidationError('panels must be an array of strings');
  }

  const panels: string[] = [];
  const seen = new Set<string>();
  for (const [i, el] of panelsRaw.entries()) {
    if (typeof el !== 'string' || !el.trim()) {
      throw new DetailFormViewConfigValidationError(
        `panels[${i}] must be a non-empty string`,
      );
    }
    const k = el.trim();
    if (seen.has(k)) {
      throw new DetailFormViewConfigValidationError(
        `panels[${i}] duplicates panel key "${k}"`,
      );
    }
    seen.add(k);
    panels.push(k);
  }

  return {
    schemaVersion: DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION,
    panels,
  };
}
