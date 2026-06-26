import { randomBytes } from 'crypto';

/** Cryptographically secure token for generic email verification flows. */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}
