import {
  LIST_VIEW_CONFIG_SCHEMA_VERSION,
  LIST_VIEW_CONFIG_TOP_LEVEL_KEYS,
} from './list-view-config.constants';
import type {
  ListPresentationMode,
  ListViewBoardSection,
  ListViewConfig,
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
  const columns = assertStringArray(o.columns, 'table.columns');
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
  const unknownKeys = Object.keys(o).filter(
    (k) => !['columns', 'defaultSort', 'rowActions', 'bulkActions'].includes(k),
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
