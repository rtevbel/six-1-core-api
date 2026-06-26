import type { ConfigObjectVerificationFieldMap } from './config-object-verification.constants';
import type { ConfigVerificationRuleDefinition } from './config-verification.constants';

/** Meta keys on `user_meta` for generic verification (Phase 6). */
export const USER_VERIFICATION_META_KEY_EXPIRES_AT = 'token_expires_at';
export const USER_VERIFICATION_META_KEY_EMAIL_VERIFIED = 'email_verified';

/**
 * Field map for `user` system_table verification (`users.activation_key` + user_meta).
 */
export const USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP: ConfigObjectVerificationFieldMap =
  {
    tokenField: 'activationKey',
    expiresAtField: USER_VERIFICATION_META_KEY_EXPIRES_AT,
    verifiedField: USER_VERIFICATION_META_KEY_EMAIL_VERIFIED,
    defaultTtlHours: 24,
  };

/** Builds the default `verify_email` rule for platform users (system_table). */
export function buildUserVerifyEmailRule(
  fieldMap: ConfigObjectVerificationFieldMap = USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP,
): ConfigVerificationRuleDefinition {
  return {
    when: {
      and: [
        {
          '==': [
            { var: `record.${fieldMap.tokenField}` },
            { var: 'input.token' },
          ],
        },
        {
          '>': [
            { var: `record.${fieldMap.expiresAtField}` },
            { var: 'now' },
          ],
        },
        { '!': [{ var: `record.${fieldMap.verifiedField}` }] },
      ],
    },
    then: {
      set: {
        [fieldMap.verifiedField]: true,
        [fieldMap.tokenField]: null,
        [fieldMap.expiresAtField]: null,
        status: 1,
      },
    },
  };
}
