import { DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION } from './detail-form-view-config.constants';

/**
 * Normalized v1 `config_json` for `view_type` `detail` or `form`.
 * `panels` is an ordered list of `panel_key` values on `config_object_view_panels`.
 */
export interface DetailFormViewConfig {
  schemaVersion: typeof DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION;
  panels: string[];
}
