import type { EntityManager } from 'typeorm';

export type SqlHandler = (
  sql: string,
  params?: unknown[],
) => unknown | Promise<unknown>;

/**
 * Lightweight in-memory SQL router for message-handler e2e flows (no live DB).
 */
export function createSqlRouter(
  handlers: Array<{ match: RegExp; handle: SqlHandler }>,
  fallback: SqlHandler = () => [],
) {
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    for (const { match, handle } of handlers) {
      if (match.test(normalized)) {
        return handle(normalized, params);
      }
    }
    return fallback(normalized, params);
  });

  const em = { query } as unknown as EntityManager;
  const qr = { manager: em };

  return { em, qr, query };
}

export function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}
