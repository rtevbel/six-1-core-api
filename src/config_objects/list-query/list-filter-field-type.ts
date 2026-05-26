/** Catalog / column field types that compare with date-time semantics for gte/lte. */
export function isTemporalListFilterFieldType(fieldType?: string): boolean {
  if (!fieldType) {
    return false;
  }
  const t = fieldType.trim().toLowerCase();
  return ['date', 'datetime', 'timestamp'].includes(t);
}

/** Catalog / column field types that compare with numeric semantics for gte/lte. */
export function isNumericListFilterFieldType(fieldType?: string): boolean {
  if (!fieldType) {
    return false;
  }
  const t = fieldType.trim().toLowerCase();
  return ['number', 'bigint', 'decimal', 'float', 'int', 'integer'].includes(t);
}

function inferPrimitiveTypeFromColumnType(columnType: unknown): string | undefined {
  const raw = typeof columnType === 'string' ? columnType.toLowerCase() : '';
  if (
    raw.includes('date') ||
    raw.includes('time') ||
    raw.includes('timestamp') ||
    raw === 'year'
  ) {
    return 'datetime';
  }
  if (
    raw.includes('int') ||
    raw === 'bigint' ||
    raw === 'smallint' ||
    raw === 'tinyint' ||
    raw.includes('decimal') ||
    raw.includes('numeric') ||
    raw === 'float' ||
    raw === 'double' ||
    raw === 'real'
  ) {
    return 'number';
  }
  if (raw === 'boolean' || raw === 'bool') {
    return 'boolean';
  }
  return undefined;
}

/** Infer list-filter field type from a TypeORM column, when catalog metadata is absent. */
export function inferListFilterFieldTypeFromColumn(column?: {
  type?: unknown;
  options?: { type?: unknown };
} | null): string | undefined {
  if (!column) {
    return undefined;
  }
  if (column.type === Date || column.options?.type === Date) {
    return 'datetime';
  }
  if (column.type === Number || column.options?.type === Number) {
    return 'number';
  }
  if (column.type === Boolean || column.options?.type === Boolean) {
    return 'boolean';
  }
  return inferPrimitiveTypeFromColumnType(column.type ?? column.options?.type);
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalizes filter values for temporal gte/lte.
 * Date-only strings use start-of-day for gte and end-of-day for lte (inclusive range).
 */
export function normalizeTemporalListFilterBound(
  value: unknown,
  operator: 'gte' | 'lte',
): string {
  const raw = String(value).trim();
  if (!raw) {
    throw new Error('empty temporal filter value');
  }
  if (DATE_ONLY_PATTERN.test(raw)) {
    return operator === 'gte' ? `${raw} 00:00:00` : `${raw} 23:59:59.999999`;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new Error('invalid temporal filter value');
  }
  const d = new Date(parsed);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}
