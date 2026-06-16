import { ConfigService } from '@nestjs/config';
import { PLATFORM_NOTIFICATION_CONTEXT_ENABLED_KEY } from './notification-platform.constants';
import { parseNotificationPlatformFlag } from './notification-platform.config';
import { NotificationPlatformFlagsService } from './notification-platform-flags.service';

describe('parseNotificationPlatformFlag', () => {
  it('defaults to false when unset', () => {
    expect(parseNotificationPlatformFlag(undefined)).toBe(false);
    expect(parseNotificationPlatformFlag('')).toBe(false);
  });

  it('parses truthy strings', () => {
    expect(parseNotificationPlatformFlag('true')).toBe(true);
    expect(parseNotificationPlatformFlag('1')).toBe(true);
    expect(parseNotificationPlatformFlag('YES')).toBe(true);
  });

  it('parses false for other values', () => {
    expect(parseNotificationPlatformFlag('false')).toBe(false);
    expect(parseNotificationPlatformFlag('0')).toBe(false);
  });

  it('parses explicit false when default is true', () => {
    expect(parseNotificationPlatformFlag('false', true)).toBe(false);
    expect(parseNotificationPlatformFlag(undefined, true)).toBe(true);
    expect(parseNotificationPlatformFlag('', true)).toBe(true);
  });
});

describe('NotificationPlatformFlagsService', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('loads notification context flag true by default', () => {
    mockGet.mockReturnValue(undefined);
    const service = new NotificationPlatformFlagsService({
      get: mockGet,
    } as unknown as ConfigService);

    expect(service.getAll().notificationContextEnabled).toBe(true);
    expect(service.isNotificationContextEnabled()).toBe(true);
  });

  it('reads enabled flag from config key', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === PLATFORM_NOTIFICATION_CONTEXT_ENABLED_KEY) return 'true';
      return undefined;
    });

    const service = new NotificationPlatformFlagsService({
      get: mockGet,
    } as unknown as ConfigService);

    expect(service.isNotificationContextEnabled()).toBe(true);
  });
});
