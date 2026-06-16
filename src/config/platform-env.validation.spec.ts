import { platformEnvValidationSchema } from './platform-env.validation';

describe('platformEnvValidationSchema', () => {
  it('accepts valid platform notification and event flags', () => {
    const { error } = platformEnvValidationSchema.validate({
      PLATFORM_NOTIFICATION_CONTEXT_ENABLED: 'true',
      PLATFORM_EVENT_BUS_ENABLED: '1',
      PLATFORM_EVENT_ENVELOPE_VALIDATION: 'warn',
      PLATFORM_EVENT_NOTIFICATION_DEDUP_WINDOW_MINUTES: '5',
      PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS: '5',
    });

    expect(error).toBeUndefined();
  });

  it('accepts omitted / empty optional flags', () => {
    const { error } = platformEnvValidationSchema.validate({
      PLATFORM_NOTIFICATION_CONTEXT_ENABLED: '',
    });

    expect(error).toBeUndefined();
  });

  it('rejects invalid envelope validation mode', () => {
    const { error } = platformEnvValidationSchema.validate({
      PLATFORM_EVENT_ENVELOPE_VALIDATION: 'maybe',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('PLATFORM_EVENT_ENVELOPE_VALIDATION');
  });

  it('rejects invalid boolean flag values', () => {
    const { error } = platformEnvValidationSchema.validate({
      PLATFORM_EVENT_BUS_ENABLED: 'enabled',
    });

    expect(error).toBeDefined();
  });

  it('rejects non-positive integer env values', () => {
    const { error } = platformEnvValidationSchema.validate({
      PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS: '0',
    });

    expect(error).toBeDefined();
  });
});
