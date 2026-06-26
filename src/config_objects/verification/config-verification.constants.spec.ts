import { applyJsonLogicRule } from '../../common/json-logic/json-logic-rule.util';
import { buildDefaultVerifyEmailRule } from './config-verification.constants';
import { DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP } from './config-object-verification.constants';

describe('config-verification.constants', () => {
  const rule = buildDefaultVerifyEmailRule(
    DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
  );

  it('accepts valid token context', () => {
    const pass = applyJsonLogicRule(rule.when, {
      record: {
        verification_token: 'abc',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: false,
      },
      input: { token: 'abc' },
      now: '2026-06-26T12:00:00.000Z',
    });
    expect(pass).toBe(true);
  });

  it('rejects expired token context', () => {
    const pass = applyJsonLogicRule(rule.when, {
      record: {
        verification_token: 'abc',
        token_expires_at: '2020-01-01T00:00:00.000Z',
        email_verified: false,
      },
      input: { token: 'abc' },
      now: '2026-06-26T12:00:00.000Z',
    });
    expect(pass).toBe(false);
  });
});
