import { ConfigService } from '@nestjs/config';
import {
  PLATFORM_EVENT_BUS_ENABLED_KEY,
  PLATFORM_EVENT_ENVELOPE_VALIDATION_KEY,
  PLATFORM_EVENT_ENVELOPE_VALIDATION_MODES,
  PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED_KEY,
  PLATFORM_EVENT_LISTENERS_WRITE_DISABLED_KEY,
  PLATFORM_ACTION_EXECUTOR_ENABLED_KEY,
  PLATFORM_EVENT_RECORD_RETENTION_DAYS_KEY,
  type PlatformEventEnvelopeValidationMode,
} from './platform-event.constants';
import { parseNotificationPlatformFlag } from '../../notifications/config/notification-platform.config';

export interface PlatformEventFlags {
  envelopeValidation: PlatformEventEnvelopeValidationMode;
  eventBusEnabled: boolean;
  notificationRulesEnabled: boolean;
  eventListenersWriteDisabled: boolean;
  actionExecutorEnabled: boolean;
  eventRecordRetentionDays?: number;
}

export function parsePlatformEventEnvelopeValidationMode(
  raw: string | undefined,
  defaultValue: PlatformEventEnvelopeValidationMode = 'off',
): PlatformEventEnvelopeValidationMode {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const normalized = String(raw).trim().toLowerCase();
  if (
    PLATFORM_EVENT_ENVELOPE_VALIDATION_MODES.includes(
      normalized as PlatformEventEnvelopeValidationMode,
    )
  ) {
    return normalized as PlatformEventEnvelopeValidationMode;
  }

  return defaultValue;
}

export function loadPlatformEventFlags(
  configService: ConfigService,
): PlatformEventFlags {
  return {
    envelopeValidation: parsePlatformEventEnvelopeValidationMode(
      configService.get<string>(PLATFORM_EVENT_ENVELOPE_VALIDATION_KEY),
    ),
    eventBusEnabled: parseNotificationPlatformFlag(
      configService.get<string>(PLATFORM_EVENT_BUS_ENABLED_KEY),
    ),
    notificationRulesEnabled: parseNotificationPlatformFlag(
      configService.get<string>(PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED_KEY),
    ),
    eventListenersWriteDisabled: parseNotificationPlatformFlag(
      configService.get<string>(PLATFORM_EVENT_LISTENERS_WRITE_DISABLED_KEY),
    ),
    actionExecutorEnabled: parseNotificationPlatformFlag(
      configService.get<string>(PLATFORM_ACTION_EXECUTOR_ENABLED_KEY),
    ),
    eventRecordRetentionDays: parseOptionalPositiveInt(
      configService.get<string>(PLATFORM_EVENT_RECORD_RETENTION_DAYS_KEY),
    ),
  };
}

function parseOptionalPositiveInt(raw?: string): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}
