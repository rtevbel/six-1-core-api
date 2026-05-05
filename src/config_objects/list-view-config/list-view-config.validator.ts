import {
  LIST_VIEW_CONFIG_SCHEMA_VERSION,
  LIST_VIEW_CONFIG_TOP_LEVEL_KEYS,
} from './list-view-config.constants';
import type {
  ListPresentationMode,
  ListViewActionEntry,
  ListViewActionSpec,
  ListViewBoardSection,
  ListViewColumnEntry,
  ListViewColumnSpec,
  ListViewConfig,
  ListViewPaginationConfig,
  ListViewTableSection,
  ListViewSortDirection,
} from './list-view-config.types';

/**
 * Thrown when `list` view `config_json` fails schema validation (authoring save).
 */
export class ListViewConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListViewConfigValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new ListViewConfigValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ListViewConfigValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ListViewConfigValidationError(`${field} must be an array of strings`);
  }
  for (const [i, el] of value.entries()) {
    if (typeof el !== 'string' || !el.trim()) {
      throw new ListViewConfigValidationError(
        `${field}[${i}] must be a non-empty string`,
      );
    }
  }
  return value as string[];
}

function parseColumnEntries(raw: unknown): ListViewColumnEntry[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new ListViewConfigValidationError('table.columns must be an array');
  }
  const out: ListViewColumnEntry[] = [];
  for (const [i, el] of raw.entries()) {
    if (typeof el === 'string') {
      const trimmed = el.trim();
      if (!trimmed) {
        throw new ListViewConfigValidationError(
          `table.columns[${i}] must be a non-empty string`,
        );
      }
      out.push(trimmed);
      continue;
    }
    if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
      const o = el as Record<string, unknown>;
      const allowedColKeys = new Set(['field', 'label']);
      for (const k of Object.keys(o)) {
        if (!allowedColKeys.has(k)) {
          throw new ListViewConfigValidationError(
            `table.columns[${i}]: unknown key "${k}"`,
          );
        }
      }
      if (typeof o.field !== 'string' || !o.field.trim()) {
        throw new ListViewConfigValidationError(
          `table.columns[${i}].field is required and must be a non-empty string`,
        );
      }
      const spec: ListViewColumnSpec = { field: o.field.trim() };
      if (o.label !== undefined && o.label !== null) {
        if (typeof o.label !== 'string') {
          throw new ListViewConfigValidationError(
            `table.columns[${i}].label must be a string`,
          );
        }
        const lt = o.label.trim();
        if (lt) {
          spec.label = lt;
        }
      }
      out.push(spec);
      continue;
    }
    throw new ListViewConfigValidationError(
      `table.columns[${i}] must be a string or an object with field`,
    );
  }
  return out.length ? out : undefined;
}

function parsePagination(raw: unknown): ListViewPaginationConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const o = assertPlainObject(raw, 'table.pagination');
  const allowed = new Set(['defaultLimit', 'limitOptions']);
  for (const k of Object.keys(o)) {
    if (!allowed.has(k)) {
      throw new ListViewConfigValidationError(
        `table.pagination: unknown key "${k}"`,
      );
    }
  }
  const out: ListViewPaginationConfig = {};
  if (o.defaultLimit !== undefined && o.defaultLimit !== null) {
    if (
      typeof o.defaultLimit !== 'number' ||
      !Number.isInteger(o.defaultLimit) ||
      o.defaultLimit < 1
    ) {
      throw new ListViewConfigValidationError(
        'table.pagination.defaultLimit must be a positive integer',
      );
    }
    out.defaultLimit = o.defaultLimit;
  }
  if (o.limitOptions !== undefined && o.limitOptions !== null) {
    if (!Array.isArray(o.limitOptions)) {
      throw new ListViewConfigValidationError(
        'table.pagination.limitOptions must be an array of positive integers',
      );
    }
    const opts: number[] = [];
    for (const [i, el] of o.limitOptions.entries()) {
      if (typeof el !== 'number' || !Number.isInteger(el) || el < 1) {
        throw new ListViewConfigValidationError(
          `table.pagination.limitOptions[${i}] must be a positive integer`,
        );
      }
      opts.push(el);
    }
    out.limitOptions = opts;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseActionEntries(raw: unknown): ListViewActionEntry[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new ListViewConfigValidationError('table.actions must be an array');
  }
  const out: ListViewActionEntry[] = [];
  for (const [i, el] of raw.entries()) {
    if (typeof el === 'string') {
      const trimmed = el.trim();
      if (!trimmed) {
        throw new ListViewConfigValidationError(
          `table.actions[${i}] must be a non-empty string`,
        );
      }
      out.push(trimmed);
      continue;
    }
    if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
      const o = el as Record<string, unknown>;
      const allowedActionKeys = new Set(['bindingKey', 'label', 'path', 'method']);
      for (const k of Object.keys(o)) {
        if (!allowedActionKeys.has(k)) {
          throw new ListViewConfigValidationError(
            `table.actions[${i}]: unknown key "${k}"`,
          );
        }
      }
      if (typeof o.bindingKey !== 'string' || !o.bindingKey.trim()) {
        throw new ListViewConfigValidationError(
          `table.actions[${i}].bindingKey is required and must be a non-empty string`,
        );
      }
      const spec: ListViewActionSpec = { bindingKey: o.bindingKey.trim() };
      if (o.label !== undefined && o.label !== null) {
        if (typeof o.label !== 'string') {
          throw new ListViewConfigValidationError(
            `table.actions[${i}].label must be a string`,
          );
        }
        const lt = o.label.trim();
        if (lt) {
          spec.label = lt;
        }
      }
      if (o.path !== undefined && o.path !== null) {
        if (typeof o.path !== 'string' || !o.path.trim()) {
          throw new ListViewConfigValidationError(
            `table.actions[${i}].path must be a non-empty string`,
          );
        }
        spec.path = o.path.trim();
      }
      if (o.method !== undefined && o.method !== null) {
        if (
          o.method !== 'GET' &&
          o.method !== 'POST' &&
          o.method !== 'PUT' &&
          o.method !== 'PATCH' &&
          o.method !== 'DELETE'
        ) {
          throw new ListViewConfigValidationError(
            `table.actions[${i}].method must be one of GET, POST, PUT, PATCH, DELETE`,
          );
        }
        spec.method = o.method;
      }
      out.push(spec);
      continue;
    }
    throw new ListViewConfigValidationError(
      `table.actions[${i}] must be a string or an object with bindingKey`,
    );
  }
  return out.length ? out : undefined;
}

function parseFilters(raw: unknown): Record<string, unknown>[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new ListViewConfigValidationError('table.filters must be an array');
  }
  const out: Record<string, unknown>[] = [];
  for (const [i, el] of raw.entries()) {
    if (el === null || typeof el !== 'object' || Array.isArray(el)) {
      throw new ListViewConfigValidationError(
        `table.filters[${i}] must be a plain object`,
      );
    }
    out.push(el as Record<string, unknown>);
  }
  return out.length ? out : undefined;
}

function parseSort(
  raw: unknown,
  fieldPath: string,
): ListViewTableSection['defaultSort'] {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const o = assertPlainObject(raw, `${fieldPath}`);
  const field = o.field;
  const direction = o.direction;
  if (typeof field !== 'string' || !field.trim()) {
    throw new ListViewConfigValidationError(`${fieldPath}.field is required`);
  }
  if (direction !== 'asc' && direction !== 'desc') {
    throw new ListViewConfigValidationError(
      `${fieldPath}.direction must be "asc" or "desc"`,
    );
  }
  return { field, direction: direction as ListViewSortDirection };
}

function parseTableSection(raw: unknown): ListViewTableSection | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const o = assertPlainObject(raw, 'table');
  const section: ListViewTableSection = {};
  const columns = parseColumnEntries(o.columns);
  if (columns) {
    section.columns = columns;
  }
  section.defaultSort = parseSort(o.defaultSort, 'table.defaultSort');
  const rowActions = assertStringArray(o.rowActions, 'table.rowActions');
  if (rowActions) {
    section.rowActions = rowActions;
  }
  const bulkActions = assertStringArray(o.bulkActions, 'table.bulkActions');
  if (bulkActions) {
    section.bulkActions = bulkActions;
  }
  const pagination = parsePagination(o.pagination);
  if (pagination) {
    section.pagination = pagination;
  }
  const filters = parseFilters(o.filters);
  if (filters) {
    section.filters = filters;
  }
  const actions = parseActionEntries(o.actions);
  if (actions) {
    section.actions = actions;
  }
  const unknownKeys = Object.keys(o).filter(
    (k) =>
      ![
        'columns',
        'defaultSort',
        'rowActions',
        'bulkActions',
        'pagination',
        'filters',
        'actions',
      ].includes(k),
  );
  if (unknownKeys.length) {
    throw new ListViewConfigValidationError(
      `table: unknown keys: ${unknownKeys.join(', ')}`,
    );
  }
  return Object.keys(section).length ? section : {};
}

function parseBoardSection(raw: unknown): ListViewBoardSection | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const o = assertPlainObject(raw, 'board');
  const section: ListViewBoardSection = {};

  const stringField = (
    key: keyof ListViewBoardSection,
    required = false,
  ): void => {
    const v = o[key as string];
    if (v === undefined || v === null) {
      if (required) {
        throw new ListViewConfigValidationError(`board.${String(key)} is required`);
      }
      return;
    }
    if (typeof v !== 'string' || !v.trim()) {
      throw new ListViewConfigValidationError(`board.${String(key)} must be a string`);
    }
    (section as Record<string, unknown>)[key as string] = v;
  };

  stringField('groupByField');
  stringField('cardTitleField');

  const subs = assertStringArray(o.cardSubtitleFields, 'board.cardSubtitleFields');
  if (subs) {
    section.cardSubtitleFields = subs;
  }
  const swim = assertStringArray(o.swimlaneOrder, 'board.swimlaneOrder');
  if (swim) {
    section.swimlaneOrder = swim;
  }

  const unknownKeys = Object.keys(o).filter(
    (k) =>
      !['groupByField', 'cardTitleField', 'cardSubtitleFields', 'swimlaneOrder'].includes(
        k,
      ),
  );
  if (unknownKeys.length) {
    throw new ListViewConfigValidationError(
      `board: unknown keys: ${unknownKeys.join(', ')}`,
    );
  }
  return Object.keys(section).length ? section : {};
}

/**
 * Validates and normalizes `list` view `config_json`.
 *
 * - **`null` / `undefined`:** returns a minimal default (`schemaVersion` only) for new rows.
 * - **Empty object `{}`:** same default (legacy-friendly).
 * - **Non-empty:** enforces top-level allowlist, `schemaVersion === 1`, and nested shapes.
 * - **`table`:** `columns` may be string field keys and/or `{ field, label? }` objects; optional
 *   `pagination`, `filters` (array of plain objects), and `actions` (string tokens and/or
 *   `{ bindingKey, label? }` objects).
 */
export function validateAndNormalizeListViewConfigJson(
  value: unknown | null | undefined,
): ListViewConfig {
  if (value === null || value === undefined) {
    return { schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION };
  }

  const obj = assertPlainObject(value, 'list config_json');

  const allowedTop = LIST_VIEW_CONFIG_TOP_LEVEL_KEYS as readonly string[];
  for (const key of Object.keys(obj)) {
    if (!allowedTop.includes(key)) {
      throw new ListViewConfigValidationError(
        `Unknown top-level key "${key}". Allowed: ${LIST_VIEW_CONFIG_TOP_LEVEL_KEYS.join(', ')}`,
      );
    }
  }

  const rawVersion = obj.schemaVersion;
  if (rawVersion === undefined || rawVersion === null) {
    if (Object.keys(obj).length === 0) {
      return { schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION };
    }
    throw new ListViewConfigValidationError('schemaVersion is required when config is non-empty');
  }
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion)) {
    throw new ListViewConfigValidationError('schemaVersion must be an integer');
  }
  if (rawVersion !== LIST_VIEW_CONFIG_SCHEMA_VERSION) {
    throw new ListViewConfigValidationError(
      `Unsupported schemaVersion ${rawVersion}; expected ${LIST_VIEW_CONFIG_SCHEMA_VERSION}`,
    );
  }

  const rawPresentation = obj.defaultPresentation;
  if (
    rawPresentation !== undefined &&
    rawPresentation !== null &&
    rawPresentation !== 'table' &&
    rawPresentation !== 'board'
  ) {
    throw new ListViewConfigValidationError(
      'defaultPresentation must be "table" or "board"',
    );
  }

  const table = parseTableSection(obj.table);
  const board = parseBoardSection(obj.board);

  const out: ListViewConfig = {
    schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION,
  };

  if (rawPresentation === 'table' || rawPresentation === 'board') {
    out.defaultPresentation = rawPresentation as ListPresentationMode;
  }
  if (table && Object.keys(table).length) {
    out.table = table;
  }
  if (board && Object.keys(board).length) {
    out.board = board;
  }

  return out;
}
