import {
  AuthoringErrorCode,
  authoringRpcException,
} from '../constants/authoring-error-codes';

export class RelationAuthoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelationAuthoringValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new RelationAuthoringValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new RelationAuthoringValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

const INLINE_MODES = ['inline_required', 'inline_optional', 'separate_step'] as const;
export type InlineRelationMode = (typeof INLINE_MODES)[number];

const RELATION_MANIFEST_MODES = [
  'relation_membership',
  'related_list',
  'inline_required',
  'inline_optional',
  'embedded_form',
] as const;
type RelationManifestMode = (typeof RELATION_MANIFEST_MODES)[number];

const RELATION_MANIFEST_DISPLAY_MODES = [
  'table',
  'cards',
  'summary',
  'form-section',
  'timeline',
  'custom-slot',
] as const;
type RelationManifestDisplayMode =
  (typeof RELATION_MANIFEST_DISPLAY_MODES)[number];

function assertRefToken(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RelationAuthoringValidationError(`${label} must be a non-empty string`);
  }
  const token = value.trim();
  if (/https?:\/\//i.test(token) || token.includes('://')) {
    throw new RelationAuthoringValidationError(
      `${label} must be a ref token, not a URL`,
    );
  }
  return token;
}

function assertManifestApiKeyRef(value: unknown, label: string): string {
  const token = assertRefToken(value, label);
  if (!/^api\.[A-Za-z0-9_]+$/.test(token)) {
    throw new RelationAuthoringValidationError(
      `${label} must be a manifest api key like "api.get" (got "${token}")`,
    );
  }
  return token;
}

/**
 * B-5: validates optional `queryConfig.inlineRelation` for nested DTO binding.
 */
export function normalizeQueryConfigInlineRelation(
  queryConfig: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...queryConfig };
  const raw = out.inlineRelation;
  if (raw === undefined || raw === null) {
    delete out.inlineRelation;
    return out;
  }
  const o = assertPlainObject(raw, 'queryConfig.inlineRelation');
  const mode = o.mode;
  if (
    typeof mode !== 'string' ||
    !(INLINE_MODES as readonly string[]).includes(mode)
  ) {
    throw new RelationAuthoringValidationError(
      `queryConfig.inlineRelation.mode must be one of: ${INLINE_MODES.join(', ')}`,
    );
  }
  const pathRaw = o.path;
  if (pathRaw !== undefined && pathRaw !== null) {
    if (typeof pathRaw !== 'string' || !pathRaw.trim()) {
      throw new RelationAuthoringValidationError(
        'queryConfig.inlineRelation.path must be a non-empty string when set',
      );
    }
  }
  const extra = Object.keys(o).filter((k) => !['mode', 'path'].includes(k));
  if (extra.length) {
    throw new RelationAuthoringValidationError(
      `queryConfig.inlineRelation: unknown keys: ${extra.join(', ')}`,
    );
  }
  const normalized: Record<string, unknown> = { mode };
  if (typeof pathRaw === 'string' && pathRaw.trim()) {
    normalized.path = pathRaw.trim();
  }
  out.inlineRelation = normalized;
  return out;
}

/**
 * X-relation: validates `relationManifestsByKey`.
 *
 * Supports both:
 * - lightweight refs (`dataRef` / `actionRef`), and
 * - richer relation metadata (mode/target/display/actions/query defaults).
 */
export function validateAndNormalizeRelationManifestsByKey(
  value: unknown | null | undefined,
): Record<string, Record<string, unknown>> | null {
  if (value === null || value === undefined) {
    return null;
  }
  const obj = assertPlainObject(value, 'relationManifestsByKey');
  const out: Record<string, Record<string, unknown>> = {};

  for (const [rawKey, block] of Object.entries(obj)) {
    const key = rawKey.trim();
    if (!key) {
      throw new RelationAuthoringValidationError(
        'relationManifestsByKey contains an empty key',
      );
    }
    const b = assertPlainObject(block, `relationManifestsByKey.${rawKey}`);
    const allowed = new Set([
      'dataRef',
      'actionRef',
      'mode',
      'targetEntityKey',
      'displayMode',
      'selectionControl',
      'columns',
      'queryDefaults',
      'actions',
    ]);
    const unknown = Object.keys(b).filter((k) => !allowed.has(k));
    if (unknown.length) {
      throw new RelationAuthoringValidationError(
        `relationManifestsByKey.${key}: unknown keys: ${unknown.join(', ')}`,
      );
    }
    const entry: Record<string, unknown> = {};
    for (const k of ['dataRef', 'actionRef'] as const) {
      const v = b[k];
      if (v === undefined || v === null) {
        continue;
      }
      entry[k] = assertRefToken(v, `relationManifestsByKey.${key}.${k}`);
    }

    const modeRaw = b.mode;
    if (modeRaw !== undefined && modeRaw !== null) {
      if (
        typeof modeRaw !== 'string' ||
        !(RELATION_MANIFEST_MODES as readonly string[]).includes(modeRaw)
      ) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.mode must be one of: ${RELATION_MANIFEST_MODES.join(', ')}`,
        );
      }
      entry.mode = modeRaw as RelationManifestMode;
    }

    const targetEntityKeyRaw = b.targetEntityKey;
    if (targetEntityKeyRaw !== undefined && targetEntityKeyRaw !== null) {
      if (
        typeof targetEntityKeyRaw !== 'string' ||
        targetEntityKeyRaw.trim().length === 0
      ) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.targetEntityKey must be a non-empty string when set`,
        );
      }
      entry.targetEntityKey = targetEntityKeyRaw.trim();
    }

    const displayModeRaw = b.displayMode;
    if (displayModeRaw !== undefined && displayModeRaw !== null) {
      if (
        typeof displayModeRaw !== 'string' ||
        !(RELATION_MANIFEST_DISPLAY_MODES as readonly string[]).includes(
          displayModeRaw,
        )
      ) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.displayMode must be one of: ${RELATION_MANIFEST_DISPLAY_MODES.join(', ')}`,
        );
      }
      entry.displayMode = displayModeRaw as RelationManifestDisplayMode;
    }

    const selectionControlRaw = b.selectionControl;
    if (selectionControlRaw !== undefined && selectionControlRaw !== null) {
      if (selectionControlRaw !== 'checkbox' && selectionControlRaw !== 'radio') {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.selectionControl must be "checkbox" or "radio" when set`,
        );
      }
      entry.selectionControl = selectionControlRaw;
    }

    const columnsRaw = b.columns;
    if (columnsRaw !== undefined && columnsRaw !== null) {
      if (!Array.isArray(columnsRaw) || columnsRaw.length === 0) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.columns must be a non-empty array when set`,
        );
      }
      const normalizedColumns: string[] = [];
      for (const [idx, col] of columnsRaw.entries()) {
        if (typeof col !== 'string' || col.trim().length === 0) {
          throw new RelationAuthoringValidationError(
            `relationManifestsByKey.${key}.columns[${idx}] must be a non-empty string`,
          );
        }
        normalizedColumns.push(col.trim());
      }
      entry.columns = normalizedColumns;
    }

    const queryDefaultsRaw = b.queryDefaults;
    if (queryDefaultsRaw !== undefined && queryDefaultsRaw !== null) {
      entry.queryDefaults = assertPlainObject(
        queryDefaultsRaw,
        `relationManifestsByKey.${key}.queryDefaults`,
      );
    }

    const actionsRaw = b.actions;
    if (actionsRaw !== undefined && actionsRaw !== null) {
      entry.actions = assertPlainObject(
        actionsRaw,
        `relationManifestsByKey.${key}.actions`,
      );
    }

    if (!entry.dataRef && !entry.actionRef && !entry.mode) {
      throw new RelationAuthoringValidationError(
        `relationManifestsByKey.${key} must set at least one of dataRef, actionRef, mode`,
      );
    }

    if (entry.mode === 'relation_membership') {
      if (typeof entry.targetEntityKey !== 'string' || !entry.targetEntityKey) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.targetEntityKey is required for mode relation_membership`,
        );
      }
      if (entry.displayMode !== 'table') {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.displayMode must be "table" for mode relation_membership`,
        );
      }
      if (entry.selectionControl === undefined) {
        entry.selectionControl = 'checkbox';
      }
      if (!entry.columns) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.columns is required for mode relation_membership`,
        );
      }
    }

    if (entry.mode === 'embedded_form') {
      if (typeof entry.targetEntityKey !== 'string' || !entry.targetEntityKey) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.targetEntityKey is required for mode embedded_form`,
        );
      }
      if (entry.displayMode !== 'form-section') {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.displayMode must be "form-section" for mode embedded_form`,
        );
      }
      if (!entry.actions || typeof entry.actions !== 'object' || Array.isArray(entry.actions)) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.actions is required for mode embedded_form`,
        );
      }

      const actions = entry.actions as Record<string, unknown>;
      const upsertRef = actions.upsertRef;
      const createRef = actions.createRef;
      const updateRef = actions.updateRef;
      const loadRef = actions.loadRef;

      if (upsertRef !== undefined && upsertRef !== null) {
        actions.upsertRef = assertManifestApiKeyRef(
          upsertRef,
          `relationManifestsByKey.${key}.actions.upsertRef`,
        );
      }
      if (createRef !== undefined && createRef !== null) {
        actions.createRef = assertManifestApiKeyRef(
          createRef,
          `relationManifestsByKey.${key}.actions.createRef`,
        );
      }
      if (updateRef !== undefined && updateRef !== null) {
        actions.updateRef = assertManifestApiKeyRef(
          updateRef,
          `relationManifestsByKey.${key}.actions.updateRef`,
        );
      }
      if (loadRef !== undefined && loadRef !== null) {
        actions.loadRef = assertManifestApiKeyRef(
          loadRef,
          `relationManifestsByKey.${key}.actions.loadRef`,
        );
      }

      const hasUpsert = typeof actions.upsertRef === 'string' && actions.upsertRef.length > 0;
      const hasCreate =
        typeof actions.createRef === 'string' && actions.createRef.length > 0;
      const hasUpdate =
        typeof actions.updateRef === 'string' && actions.updateRef.length > 0;

      if (!hasUpsert && !(hasCreate && hasUpdate)) {
        throw new RelationAuthoringValidationError(
          `relationManifestsByKey.${key}.actions must include upsertRef or both createRef and updateRef for mode embedded_form`,
        );
      }
    }

    out[key] = entry;
  }

  return Object.keys(out).length ? out : null;
}

export function mapRelationAuthoringErrorToRpc(error: unknown): never {
  if (error instanceof RelationAuthoringValidationError) {
    throw authoringRpcException(
      AuthoringErrorCode.RelationConfigInvalid,
      error.message,
    );
  }
  throw error;
}
