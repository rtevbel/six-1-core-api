/**
 * Stable machine-readable runtime diagnostic/error codes for Object Runner contracts.
 * Gateway/frontend should branch on `code` and treat `message` as display/log text.
 */
export const RuntimeErrorCode = {
  SchemaNotFound: 'SIX1_RUNTIME_SCHEMA_NOT_FOUND',
  ViewListMissing: 'SIX1_RUNTIME_VIEW_LIST_MISSING',
  ViewDetailMissing: 'SIX1_RUNTIME_VIEW_DETAIL_MISSING',
  ViewFormMissing: 'SIX1_RUNTIME_VIEW_FORM_MISSING',
  ViewConfigInvalid: 'SIX1_RUNTIME_VIEW_CONFIG_INVALID',
  FieldKeyUnresolved: 'SIX1_RUNTIME_FIELD_KEY_UNRESOLVED',
  PanelKeyUnresolved: 'SIX1_RUNTIME_PANEL_KEY_UNRESOLVED',
  RelationKeyUnresolved: 'SIX1_RUNTIME_RELATION_KEY_UNRESOLVED',
  SubmitFieldForbidden: 'SIX1_RUNTIME_SUBMIT_FIELD_FORBIDDEN',
  SubmitRequiredFieldMissing: 'SIX1_RUNTIME_SUBMIT_REQUIRED_FIELD_MISSING',
  SubmitRequiredRelationMissing: 'SIX1_RUNTIME_SUBMIT_REQUIRED_RELATION_MISSING',
  RelationQueryDepthExceeded: 'SIX1_RUNTIME_RELATION_QUERY_DEPTH_EXCEEDED',
  RelationActionForbidden: 'SIX1_RUNTIME_RELATION_ACTION_FORBIDDEN',
  RelationActionUnknown: 'SIX1_RUNTIME_RELATION_ACTION_UNKNOWN',
} as const;

export type RuntimeErrorCodeValue =
  (typeof RuntimeErrorCode)[keyof typeof RuntimeErrorCode];
