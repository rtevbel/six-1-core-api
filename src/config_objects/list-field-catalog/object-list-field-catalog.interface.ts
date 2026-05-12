/**
 * Operators supported by domain list APIs that mirror structured filters.
 * Align with domain DTOs (e.g. customer FiltersDto conditions).
 */
export type ObjectListFieldCatalogFilterOperator =
  | 'eq'
  | 'contains'
  | 'gte'
  | 'lte'
  | 'in';

export interface ObjectListFieldCatalogEntry {
  fieldKey: string;
  source: 'core' | 'meta' | 'related';
  /**
   * Relationship key from the schema relation catalog (same as `relations[].relationshipKey`).
   * Present when `source` is `related`.
   */
  relationshipKey?: string;
  label: string;
  fieldType: string;
  filterable: boolean;
  sortable: boolean;
  filterOperators: ObjectListFieldCatalogFilterOperator[];
}

/** Response for `v0.1_get_object_list_field_catalog`. */
export interface ObjectListFieldCatalogView {
  /** Canonical object type (`customer`, `project`, …). */
  objectType: string;
  tenantId: number | null;
  schemaFound: boolean;
  fields: ObjectListFieldCatalogEntry[];
  catalogVersion: number;
}
