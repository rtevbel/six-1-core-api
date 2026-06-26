import { ConfigService } from '@nestjs/config';
import { ConfigVerificationRateLimitService } from './config-verification-rate-limit.service';

describe('ConfigVerificationRateLimitService', () => {
  function createService(config: Record<string, string | undefined>) {
    return new ConfigVerificationRateLimitService({
      get: (key: string) => config[key],
    } as ConfigService);
  }

  it('allows attempts under the client limit', () => {
    const service = createService({
      CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS: '2',
      CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS: '5',
      CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS: '60',
    });

    expect(
      service.checkAndRecord({
        objectType: 'customer',
        token: 'a',
        clientKey: 'ip-1',
      }).allowed,
    ).toBe(true);
    expect(
      service.checkAndRecord({
        objectType: 'customer',
        token: 'b',
        clientKey: 'ip-1',
      }).allowed,
    ).toBe(true);
  });

  it('blocks when client limit is exceeded', () => {
    const service = createService({
      CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS: '1',
      CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS: '5',
      CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS: '60',
    });

    service.checkAndRecord({
      objectType: 'user',
      token: 'tok-1',
      clientKey: 'ip-2',
    });
    const blocked = service.checkAndRecord({
      objectType: 'user',
      token: 'tok-2',
      clientKey: 'ip-2',
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
