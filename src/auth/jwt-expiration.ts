import type { SignOptions } from 'jsonwebtoken';

/**
 * Resolves JWT `expiresIn` for @nestjs/jwt / jsonwebtoken.
 *
 * Env values like `1d` or `15m` must not be passed through `parseInt` (that yields `1` second).
 */
export function resolveJwtExpiresIn(
  raw: string | null | undefined,
  fallback: NonNullable<SignOptions['expiresIn']> = '1d',
): SignOptions['expiresIn'] {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return fallback;

  // Plain integer string → seconds (e.g. `86400`).
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Duration strings supported by jsonwebtoken (`1d`, `15m`, `24h`, `7 days`, …).
  return trimmed as SignOptions['expiresIn'];
}
