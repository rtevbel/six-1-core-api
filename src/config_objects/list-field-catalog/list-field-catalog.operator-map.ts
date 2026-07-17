import type { ObjectListFieldCatalogFilterOperator } from './object-list-field-catalog.interface';

/** Maps descriptor / config field types to allowed list-filter operators (SQL-safe families). */
export function resolveFilterOperatorsForListFieldType(
  fieldType: string,
): ObjectListFieldCatalogFilterOperator[] {
  const t = fieldType.trim().toLowerCase();
  if (t === 'attachment' || t === 'file' || t === 'media') {
    return ['eq', 'in'];
  }
  if (
    ['number', 'bigint', 'decimal', 'float', 'int', 'integer'].includes(t)
  ) {
    return ['eq', 'gte', 'lte', 'in'];
  }
  if (['boolean', 'bool', 'tinyint'].includes(t)) {
    return ['eq', 'in'];
  }
  if (['date', 'datetime', 'timestamp'].includes(t)) {
    return ['eq', 'gte', 'lte', 'in'];
  }
  return ['eq', 'contains', 'in'];
}
