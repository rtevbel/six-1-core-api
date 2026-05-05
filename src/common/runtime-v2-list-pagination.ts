/**
 * Runtime v2 list envelope pagination (shared by microservice list RPCs).
 * Matches gateway list DTOs: top-level `page`, `limit`, `total`, `totalPages`
 * and the same four fields under `pagination`.
 */
export type RuntimeV2ListPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function buildRuntimeV2ListPagination(
  page: number | undefined,
  limit: number | undefined,
  total: number,
  defaultLimit = 10,
): RuntimeV2ListPagination {
  const effLimit =
    typeof limit === 'number' && limit > 0 ? limit : defaultLimit;
  const effPage = typeof page === 'number' && page >= 1 ? page : 1;
  return {
    total,
    page: effPage,
    limit: effLimit,
    totalPages: Math.max(1, Math.ceil(total / effLimit)),
  };
}
