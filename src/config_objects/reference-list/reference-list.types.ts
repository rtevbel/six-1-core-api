import type { REFERENCE_LIST_CATALOG_VERSION } from './reference-list.constants';

export type ReferenceListKind = 'core' | 'entity_key';

/**
 * Describes how clients resolve lookup options for a `dataRef` token.
 * Core stores metadata only; runtime resolution is performed by gateway/mobile.
 */
export interface ReferenceListCatalogEntry {
  token: string;
  kind: ReferenceListKind;
  objectType: string;
  listPattern: string;
  valueKey: string;
  labelKey: string;
  requiredQueryParams?: string[];
  description?: string;
}

export interface ReferenceListCatalogView {
  catalogVersion: typeof REFERENCE_LIST_CATALOG_VERSION;
  generatedAt: string;
  entries: ReferenceListCatalogEntry[];
}
