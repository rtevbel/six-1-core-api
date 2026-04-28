/** Supported `schemaVersion` for `detail` / `form` view `config_json`. */
export const DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION = 1 as const;

/** Allowed top-level keys on `detail` / `form` view `config_json`. */
export const DETAIL_FORM_VIEW_CONFIG_TOP_LEVEL_KEYS = [
  'schemaVersion',
  'panels',
] as const;
