import { buildConfigObjectVerificationUrl, verificationUrlPathForObjectType } from './config-object-verification-url.util';

describe('config-object-verification-url.util', () => {
  it('builds path segment from object type', () => {
    expect(verificationUrlPathForObjectType('customer')).toBe('/verify-customer');
    expect(verificationUrlPathForObjectType('tenant_user')).toBe(
      '/verify-tenant-user',
    );
  });

  it('builds absolute verification URL with token query param', () => {
    expect(
      buildConfigObjectVerificationUrl(
        'https://app.example.com',
        'customer',
        'tok-abc',
      ),
    ).toBe('https://app.example.com/verify-customer?token=tok-abc');
  });

  it('returns null when base URL is missing', () => {
    expect(
      buildConfigObjectVerificationUrl(null, 'customer', 'tok-abc'),
    ).toBeNull();
  });
});
