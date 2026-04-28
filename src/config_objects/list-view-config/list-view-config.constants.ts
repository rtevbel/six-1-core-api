/** Supported `schemaVersion` values for `list` view `config_json` (bump when shape breaks). */
export const LIST_VIEW_CONFIG_SCHEMA_VERSION = 1 as const;

/** Top-level keys allowed on `list` view `config_json` (unknown keys rejected at save). */
export const LIST_VIEW_CONFIG_TOP_LEVEL_KEYS = [
  'schemaVersion',
  'defaultPresentation',
  'table',
  'board',
] as const;
