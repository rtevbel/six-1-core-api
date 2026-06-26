/**
 * Default meta field keys for generic email verification (Phase 1).
 * @see docs/generic-email-verification-platform.md
 */
export const DEFAULT_VERIFICATION_TOKEN_FIELD = 'verification_token';
export const DEFAULT_VERIFICATION_EXPIRES_AT_FIELD = 'token_expires_at';
export const DEFAULT_VERIFICATION_VERIFIED_FIELD = 'email_verified';
export const DEFAULT_VERIFICATION_TTL_HOURS = 24;

/** Section key for system-managed verification meta fields (excluded from default forms). */
export const CONFIG_OBJECT_VERIFICATION_SECTION_KEY = '__verification';

export interface ConfigObjectVerificationFieldMap {
  tokenField: string;
  expiresAtField: string;
  verifiedField: string;
  defaultTtlHours?: number;
}

export const DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP: ConfigObjectVerificationFieldMap =
  {
    tokenField: DEFAULT_VERIFICATION_TOKEN_FIELD,
    expiresAtField: DEFAULT_VERIFICATION_EXPIRES_AT_FIELD,
    verifiedField: DEFAULT_VERIFICATION_VERIFIED_FIELD,
    defaultTtlHours: DEFAULT_VERIFICATION_TTL_HOURS,
  };
