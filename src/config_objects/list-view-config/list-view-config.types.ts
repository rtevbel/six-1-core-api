export type ListPresentationMode = 'table' | 'board';

export type ListViewSortDirection = 'asc' | 'desc';

export interface ListViewTableSort {
  field: string;
  direction: ListViewSortDirection;
}

/**
 * Optional per-column display override. `field` must match a `fieldRegistry` key.
 * When omitted, the runner may use the schema label for that field.
 */
export interface ListViewColumnSpec {
  field: string;
  label?: string;
}

/**
 * Column spec: either a field key string (legacy) or an object with `field` and optional `label`.
 */
export type ListViewColumnEntry = string | ListViewColumnSpec;

/**
 * Toolbar / primary list action: optional human label plus stable binding key for the runner.
 */
export interface ListViewActionSpec {
  bindingKey: string;
  label?: string;
  /** Optional gateway/api path hint (e.g. `customers/{id}`). */
  path?: string;
  /** Optional HTTP verb hint for runtime adapters. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/** Legacy string token or structured action (e.g. create / detail / update). */
export type ListViewActionEntry = string | ListViewActionSpec;

/**
 * Table pagination hints for list UIs (authoring; runner may still enforce server limits).
 */
export interface ListViewPaginationConfig {
  defaultLimit?: number;
  limitOptions?: number[];
}

/**
 * Table/grid presentation subsection for a `list` view (`config_json.table`).
 */
export interface ListViewTableSection {
  /** Field keys, or objects with `field` + optional `label` for column headers. */
  columns?: ListViewColumnEntry[];
  defaultSort?: ListViewTableSort;
  rowActions?: string[];
  bulkActions?: string[];
  pagination?: ListViewPaginationConfig;
  /**
   * Authoring-time filter definitions (shape is product-defined; each entry is a plain object).
   */
  filters?: Record<string, unknown>[];
  /**
   * Toolbar actions: string tokens and/or `{ bindingKey, label? }` objects
   * (distinct from `rowActions` / `bulkActions`).
   */
  actions?: ListViewActionEntry[];
}

/**
 * Board / kanban presentation subsection (`config_json.board`).
 */
export interface ListViewBoardSection {
  groupByField?: string;
  cardTitleField?: string;
  cardSubtitleFields?: string[];
  swimlaneOrder?: string[];
}

/**
 * Normalized `config_json` for `view_type = list` (table + board on one row).
 * `schemaVersion` must equal {@link LIST_VIEW_CONFIG_SCHEMA_VERSION} when validated for save.
 */
export interface ListViewConfig {
  schemaVersion: number;
  defaultPresentation?: ListPresentationMode;
  table?: ListViewTableSection;
  board?: ListViewBoardSection;
}

/**
 * Resolves {@link ListViewTableSection.columns} entries to field keys for schema / diagnostics.
 */
export function listViewColumnFieldKeys(
  columns: ListViewColumnEntry[] | undefined,
): string[] {
  if (!columns?.length) {
    return [];
  }
  return columns.map((c) => (typeof c === 'string' ? c : c.field));
}

/**
 * Stable binding keys for {@link ListViewTableSection.actions} (for diagnostics / runner).
 */
export function listViewActionBindingKeys(
  actions: ListViewActionEntry[] | undefined,
): string[] {
  if (!actions?.length) {
    return [];
  }
  return actions.map((a) => (typeof a === 'string' ? a : a.bindingKey));
}
