import {
  PANEL_LAYOUT_CONFIG_SCHEMA_VERSION,
  PANEL_LAYOUT_DATA_BINDING_VALUES,
  PANEL_LAYOUT_DISPLAY_MODES,
  PANEL_LAYOUT_RELATION_PANEL_MODES,
} from './panel-layout.constants';

/**
 * Static v1 contract metadata (validator enforces the same rules).
 * Useful for docs and future OpenAPI / JSON Schema generation.
 */
export const panelLayoutConfigV1SchemaMetadata = {
  id: 'six1:panel-layout-config:v1',
  schemaVersion: PANEL_LAYOUT_CONFIG_SCHEMA_VERSION,
  displayModes: [...PANEL_LAYOUT_DISPLAY_MODES],
  dataBindings: [...PANEL_LAYOUT_DATA_BINDING_VALUES],
  relationPanelModes: [...PANEL_LAYOUT_RELATION_PANEL_MODES],
} as const;
