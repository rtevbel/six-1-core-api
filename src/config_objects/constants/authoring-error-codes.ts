import { RpcException } from '@nestjs/microservices';

/**
 * Stable machine-readable codes for Object Designer / authoring failures (C-3).
 * Gateway and builders should branch on `code`; `message` remains human-readable.
 */
export const AuthoringErrorCode = {
  FieldInlineBundleForbidden: 'SIX1_AUTHORING_FIELD_INLINE_BUNDLE_FORBIDDEN',
  ScopeTenantMismatch: 'SIX1_AUTHORING_SCOPE_TENANT_MISMATCH',
  ViewUnknownFieldKeys: 'SIX1_AUTHORING_VIEW_UNKNOWN_FIELD_KEYS',
  ViewSchemaUnavailable: 'SIX1_AUTHORING_VIEW_SCHEMA_UNAVAILABLE',
  ViewListConfigInvalid: 'SIX1_AUTHORING_VIEW_LIST_CONFIG_INVALID',
  ViewDetailFormConfigInvalid: 'SIX1_AUTHORING_VIEW_DETAIL_FORM_CONFIG_INVALID',
  ViewPanelKeyUnknown: 'SIX1_AUTHORING_VIEW_PANEL_KEY_UNKNOWN',
  PanelLayoutInvalid: 'SIX1_AUTHORING_PANEL_LAYOUT_INVALID',
  RelationPublishedEndpoints: 'SIX1_AUTHORING_RELATION_PUBLISHED_ENDPOINTS',
  RelationCatalogNotFound: 'SIX1_AUTHORING_RELATION_CATALOG_NOT_FOUND',
  RelationConfigInvalid: 'SIX1_AUTHORING_RELATION_CONFIG_INVALID',
  DerivedDisplayInvalid: 'SIX1_AUTHORING_DERIVED_DISPLAY_INVALID',
  LookupSelectInvalid: 'SIX1_AUTHORING_LOOKUP_SELECT_INVALID',
  DerivedRuntimeInvalid: 'SIX1_AUTHORING_DERIVED_RUNTIME_INVALID',
} as const;

export type AuthoringErrorCodeValue =
  (typeof AuthoringErrorCode)[keyof typeof AuthoringErrorCode];

/**
 * RpcException payload shape returned through {@link AppRpcExceptionsFilter}
 * when `getError()` is an object (not a plain string).
 */
export function authoringRpcException(
  code: AuthoringErrorCodeValue,
  message: string,
): RpcException {
  return new RpcException({ code, message });
}
