import {
  DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
  DEFAULT_VERIFICATION_TOKEN_FIELD,
} from './config-object-verification.constants';
import {
  parseConfigObjectVerificationFieldMap,
  resolveConfigObjectVerificationFieldMap,
  resolveEffectiveVerificationFieldMap,
} from './config-object-verification.util';

describe('config-object-verification.util', () => {
  it('parses a valid verification_field_map', () => {
    expect(
      parseConfigObjectVerificationFieldMap({
        tokenField: 'verification_token',
        expiresAtField: 'token_expires_at',
        verifiedField: 'email_verified',
        defaultTtlHours: 48,
      }),
    ).toEqual({
      tokenField: 'verification_token',
      expiresAtField: 'token_expires_at',
      verifiedField: 'email_verified',
      defaultTtlHours: 48,
    });
  });

  it('returns null for invalid verification_field_map', () => {
    expect(parseConfigObjectVerificationFieldMap(null)).toBeNull();
    expect(parseConfigObjectVerificationFieldMap({ tokenField: '' })).toBeNull();
  });

  it('resolves persisted map from config object entity shape', () => {
    expect(
      resolveConfigObjectVerificationFieldMap({
        verificationFieldMap: {
          tokenField: 'custom_token',
          expiresAtField: 'custom_expires',
          verifiedField: 'custom_verified',
        },
      }),
    ).toEqual({
      tokenField: 'custom_token',
      expiresAtField: 'custom_expires',
      verifiedField: 'custom_verified',
    });
  });

  it('falls back to defaults when map is unset', () => {
    expect(
      resolveEffectiveVerificationFieldMap({ verificationFieldMap: null }),
    ).toEqual(DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP);
    expect(
      resolveEffectiveVerificationFieldMap({ verificationFieldMap: null })
        .tokenField,
    ).toBe(DEFAULT_VERIFICATION_TOKEN_FIELD);
  });
});
