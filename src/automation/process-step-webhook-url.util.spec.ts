import { assertWebhookUrlAllowed } from './process-step-webhook-url.util';

describe('process-step-webhook-url.util', () => {
  it('allows public https URLs when no allowlist is configured', () => {
    const parsed = assertWebhookUrlAllowed('https://api.partner.io/hooks', []);
    expect(parsed.hostname).toBe('api.partner.io');
  });

  it('blocks localhost and private-network hosts', () => {
    expect(() => assertWebhookUrlAllowed('http://127.0.0.1/hook', [])).toThrow(
      'not allowed',
    );
    expect(() =>
      assertWebhookUrlAllowed('https://10.0.0.5/internal', []),
    ).toThrow('not allowed');
  });

  it('enforces host suffix allowlist when configured', () => {
    expect(() =>
      assertWebhookUrlAllowed('https://evil.example/hook', ['partner.io']),
    ).toThrow('allowlist');

    const parsed = assertWebhookUrlAllowed(
      'https://hooks.partner.io/notify',
      ['partner.io'],
    );
    expect(parsed.hostname).toBe('hooks.partner.io');
  });

  it('rejects unsupported protocols', () => {
    expect(() => assertWebhookUrlAllowed('ftp://files.example/hook', [])).toThrow(
      'http or https',
    );
  });
});
