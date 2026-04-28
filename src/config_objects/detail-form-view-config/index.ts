export {
  DETAIL_FORM_VIEW_CONFIG_SCHEMA_VERSION,
  DETAIL_FORM_VIEW_CONFIG_TOP_LEVEL_KEYS,
} from './detail-form-view-config.constants';
export type { DetailFormViewConfig } from './detail-form-view-config.types';
export {
  DetailFormViewConfigValidationError,
  validateAndNormalizeDetailFormViewConfigJson,
} from './detail-form-view-config.validator';
