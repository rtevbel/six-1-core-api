/**
 * Computes exponential backoff for notification send retries (P8).
 */
export function computeNotificationRetryDelayMs(
  attemptNumber: number,
  baseSeconds: number,
  maxDelayMs = 3_600_000,
): number {
  const attempt = Math.max(1, attemptNumber);
  const baseMs = Math.max(1, baseSeconds) * 1000;
  const delay = baseMs * 2 ** (attempt - 1);
  return Math.min(delay, maxDelayMs);
}

export function computeNotificationNextRetryAt(
  attemptNumber: number,
  baseSeconds: number,
  from: Date = new Date(),
): Date {
  const delayMs = computeNotificationRetryDelayMs(attemptNumber, baseSeconds);
  return new Date(from.getTime() + delayMs);
}
