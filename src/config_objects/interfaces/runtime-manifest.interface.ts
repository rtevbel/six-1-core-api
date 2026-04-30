import type { ConfigObjectViewType } from '../constants/config-object-view-type';

export type RuntimeManifestDiagnosticLevel = 'info' | 'warn' | 'error';
export type RuntimeManifestDiagnosticRefType = 'fieldKey' | 'panelKey' | 'relationKey';

export interface RuntimeManifestDiagnostic {
  code: string;
  message: string;
  level: RuntimeManifestDiagnosticLevel;
  refType?: RuntimeManifestDiagnosticRefType;
  refKey?: string;
}

export interface RuntimeManifestViewSection {
  viewType: ConfigObjectViewType;
  config: Record<string, unknown> | null;
  resolved: Record<string, unknown>;
}

export interface ConfigObjectRuntimeManifestView {
  entityKey: string;
  tenantId: number | null;
  generatedAt: string;
  list: RuntimeManifestViewSection | null;
  detail: RuntimeManifestViewSection | null;
  form: RuntimeManifestViewSection | null;
  diagnostics: RuntimeManifestDiagnostic[];
}

export interface RuntimeCacheInvalidationResult {
  ttlMs: number;
  cleared: {
    schema: number;
    view: number;
    manifest: number;
  };
}

export interface RuntimeComposedSubmitPayloadView {
  entityKey: string;
  tenantId: number | null;
  operation: 'create' | 'update';
  payload: Record<string, unknown>;
}

export interface RuntimeRelationActionValidationResult {
  entityKey: string;
  tenantId: number | null;
  relationKey: string;
  actionRef: string;
  allowed: boolean;
  requiredPermissions: string[];
  missingPermissions: string[];
}
