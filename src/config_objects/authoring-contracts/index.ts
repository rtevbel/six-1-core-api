/**
 * Published authoring contracts for gateway / Object Designer consumers (C-5).
 * Import from `@/` path alias if configured, or deep import this module.
 */

export {
  CONFIG_OBJECT_VIEW_TYPES,
  type ConfigObjectViewType,
} from '../constants/config-object-view-type';
export {
  AuthoringErrorCode,
  type AuthoringErrorCodeValue,
  authoringRpcException,
} from '../constants/authoring-error-codes';
export type { DetailFormViewConfig } from '../detail-form-view-config';
export type { ListViewConfig } from '../list-view-config';
export type { PanelLayoutConfig } from '../panel-layout';
