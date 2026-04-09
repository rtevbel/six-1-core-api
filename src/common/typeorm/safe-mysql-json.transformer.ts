import type { ValueTransformer } from 'typeorm';

/**
 * Normalizes values read from MySQL JSON (or text) columns so hydration never
 * throws on legacy / invalid stored strings (e.g. literal "undefined").
 */
function parseJsonFromDb(raw: unknown): unknown {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw;
  }
  const s =
    typeof raw === 'string'
      ? raw
      : Buffer.isBuffer(raw)
        ? raw.toString('utf8')
        : String(raw);
  const trimmed = s.trim();
  if (
    trimmed === '' ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return null;
  }
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

/**
 * Use with `type: 'text'` on columns that are physically MySQL `JSON`, so
 * TypeORM's driver does not run `JSON.parse` before this transformer.
 */
export const safeMysqlJsonTransformer: ValueTransformer = {
  to(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.stringify(value);
  },
  from(value: unknown): unknown {
    return parseJsonFromDb(value);
  },
};
