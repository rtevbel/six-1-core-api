import { ConfigService } from '@nestjs/config';
import {
  PLATFORM_NOTIFICATION_CONTEXT_ENABLED_KEY,
  PLATFORM_NOTIFICATION_IMMEDIATE_DISPATCH_ENABLED_KEY,
  PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS_KEY,
  PLATFORM_NOTIFICATION_RETRY_BASE_SECONDS_KEY,
} from './notification-platform.constants';

export interface NotificationPlatformFlags {
  notificationContextEnabled: boolean;
  immediateDispatchEnabled: boolean;
  maxSendAttempts: number;
  retryBaseSeconds: number;
}

const TRUTHY = new Set(['true', '1', 'yes', 'on']);

/**
 * Parses an environment value as boolean. Unset or unknown values → `defaultValue`.
 */
export function parseNotificationPlatformFlag(
  raw: string | undefined,
  defaultValue = false,
): boolean {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return TRUTHY.has(String(raw).trim().toLowerCase());
}

export function loadNotificationPlatformFlags(
  configService: ConfigService,
): NotificationPlatformFlags {
  return {
    notificationContextEnabled: parseNotificationPlatformFlag(
      configService.get<string>(PLATFORM_NOTIFICATION_CONTEXT_ENABLED_KEY),
      true,
    ),
    immediateDispatchEnabled: parseNotificationPlatformFlag(
      configService.get<string>(
        PLATFORM_NOTIFICATION_IMMEDIATE_DISPATCH_ENABLED_KEY,
      ),
    ),
    maxSendAttempts: parsePositiveInt(
      configService.get<string>(PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS_KEY),
      5,
    ),
    retryBaseSeconds: parsePositiveInt(
      configService.get<string>(PLATFORM_NOTIFICATION_RETRY_BASE_SECONDS_KEY),
      30,
    ),
  };
}

function parsePositiveInt(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.trunc(parsed);
}
