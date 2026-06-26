import {
  DEFAULT_CONFIG_OBJECT_VERIFICATION_URL_PATHS,
  normalizeVerificationUrlPath,
  parseVerificationUrlRegistryFromConfig,
  resolveVerificationUrlPath,
} from './config-object-verification-url.registry';

describe('config-object-verification-url.registry', () => {
  it('resolves known object types from defaults', () => {
    expect(resolveVerificationUrlPath('customer')).toBe('/verify-customer');
    expect(resolveVerificationUrlPath('tenant_user')).toBe('/verify-tenant-user');
    expect(resolveVerificationUrlPath('user')).toBe('/verify-email');
  });

  it('falls back to kebab-case convention for unknown types', () => {
    expect(resolveVerificationUrlPath('vendor_contact')).toBe(
      '/verify-vendor-contact',
    );
  });

  it('applies config overrides', () => {
    expect(
      resolveVerificationUrlPath('customer', {
        customer: '/custom-verify-customer',
      }),
    ).toBe('/custom-verify-customer');
  });

  it('parses registry JSON from config', () => {
    expect(
      parseVerificationUrlRegistryFromConfig(
        JSON.stringify({ customer: 'verify-customer' }),
      ),
    ).toEqual({ customer: '/verify-customer' });
  });

  it('exports stable default registry keys', () => {
    expect(DEFAULT_CONFIG_OBJECT_VERIFICATION_URL_PATHS.customer).toBe(
      '/verify-customer',
    );
    expect(normalizeVerificationUrlPath('verify-customer')).toBe(
      '/verify-customer',
    );
  });
});
