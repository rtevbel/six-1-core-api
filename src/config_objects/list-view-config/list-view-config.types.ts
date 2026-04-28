export type ListPresentationMode = 'table' | 'board';

export type ListViewSortDirection = 'asc' | 'desc';

export interface ListViewTableSort {
  field: string;
  direction: ListViewSortDirection;
}

/**
 * Table/grid presentation subsection for a `list` view (`config_json.table`).
 */
export interface ListViewTableSection {
  columns?: string[];
  defaultSort?: ListViewTableSort;
  rowActions?: string[];
  bulkActions?: string[];
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
