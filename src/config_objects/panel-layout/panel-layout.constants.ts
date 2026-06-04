/** Supported `schemaVersion` for `config_object_view_panels.layout_config` (bump on breaking changes). */
export const PANEL_LAYOUT_CONFIG_SCHEMA_VERSION = 1 as const;

/** Allowed top-level keys on panel `layout_config` (unknown keys rejected at save). */
export const PANEL_LAYOUT_CONFIG_TOP_LEVEL_KEYS = [
  'schemaVersion',
  'displayMode',
  'dataBinding',
  'layout',
  'actions',
  'style',
  'permissions',
  'pagination',
  'sort',
  'emptyState',
] as const;

export const PANEL_LAYOUT_DISPLAY_MODES = [
  'table',
  'cards',
  'summary',
  'form-section',
  'timeline',
  'custom-slot',
] as const;

export const PANEL_LAYOUT_DATA_BINDING_VALUES = [
  'main',
  'relation',
  'derived',
] as const;

/** Optional `layout.relationPanelMode` on table panels (relation UI manifest). */
export const PANEL_LAYOUT_RELATION_PANEL_MODES = [
  'relation_membership',
  'related_list',
  'inline_required',
  'inline_optional',
  'embedded_form',
] as const;
