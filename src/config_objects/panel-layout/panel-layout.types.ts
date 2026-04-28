import {
  PANEL_LAYOUT_CONFIG_SCHEMA_VERSION,
  PANEL_LAYOUT_DATA_BINDING_VALUES,
  PANEL_LAYOUT_DISPLAY_MODES,
} from './panel-layout.constants';

export type PanelLayoutDisplayMode =
  (typeof PANEL_LAYOUT_DISPLAY_MODES)[number];

export type PanelLayoutDataBinding =
  (typeof PANEL_LAYOUT_DATA_BINDING_VALUES)[number];

/**
 * Normalized v1 `layout_config` JSON for `config_object_view_panels`.
 * Mode-specific `layout` fields are validated in the validator module.
 */
export interface PanelLayoutConfig {
  schemaVersion: typeof PANEL_LAYOUT_CONFIG_SCHEMA_VERSION;
  displayMode: PanelLayoutDisplayMode;
  dataBinding?: PanelLayoutDataBinding;
  layout: Record<string, unknown>;
  actions?: Record<string, unknown>;
  style?: Record<string, unknown>;
  permissions?: unknown;
  pagination?: unknown;
  sort?: unknown;
  emptyState?: unknown;
}
