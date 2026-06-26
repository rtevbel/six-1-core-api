/**
 * Normalizes config object types for generic email verification.
 * `tenant_user` links share the platform `users` row (`activation_key`).
 */
export function normalizeVerificationObjectType(objectType: string): string {
  const key = objectType.trim();
  if (!key) {
    return key;
  }
  if (key === 'tenant_user') {
    return 'user';
  }
  return key;
}
