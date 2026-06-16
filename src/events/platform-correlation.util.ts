import { randomUUID } from 'crypto';

/**
 * Returns an explicit correlation id, an optional fallback, or a new UUID (P7).
 */
export function resolveCorrelationId(
  explicit?: string | null,
  fallback?: string | null,
): string {
  const candidate = explicit?.trim() || fallback?.trim();
  return candidate && candidate.length > 0 ? candidate : randomUUID();
}

/**
 * Returns a correlation id when one is already present; otherwise undefined.
 */
export function readOptionalCorrelationId(
  value?: string | null,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
