export const CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION = 1 as const;
export const CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION = 1 as const;

export type CoreFieldDerivedRuntimeOperation = 'concat' | 'coalesce';

/**
 * Authoring/runtime metadata for lookup-backed select inputs.
 * Stored as tokenized refs; transport/gateway resolves `dataRef`.
 */
export interface CoreFieldLookupSelectConfig {
  schemaVersion: typeof CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION;
  dataRef: string;
  valueKey: string;
  labelKey: string;
  queryDefaults?: Record<string, unknown>;
  searchable?: boolean;
  multi?: boolean;
}

/**
 * Runtime metadata for derived display values built from multiple source fields.
 * Initial v1 operations are intentionally small and deterministic.
 */
export interface CoreFieldDerivedRuntimeConfig {
  schemaVersion: typeof CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION;
  operation: CoreFieldDerivedRuntimeOperation;
  sourceFieldKeys: string[];
  separator?: string;
  nullDisplayValue?: string;
  trim?: boolean;
  /** When true (default), derived values are read-only in write-schema merge. */
  displayOnly?: boolean;
}
