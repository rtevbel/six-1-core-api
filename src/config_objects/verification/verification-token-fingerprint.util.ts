import { createHash } from 'crypto';

/** Non-reversible short fingerprint for audit logs (never store raw tokens). */
export function verificationTokenFingerprint(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex').slice(0, 16);
}
