export const PLATFORM_EVENT_ENVELOPE_VALIDATION_KEY =
  'PLATFORM_EVENT_ENVELOPE_VALIDATION';

export const PLATFORM_EVENT_BUS_ENABLED_KEY = 'PLATFORM_EVENT_BUS_ENABLED';

export const PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED_KEY =
  'PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED';

/** Minutes to suppress duplicate dispatches for same user + event + correlationId. */
export const PLATFORM_EVENT_NOTIFICATION_DEDUP_WINDOW_MINUTES_KEY =
  'PLATFORM_EVENT_NOTIFICATION_DEDUP_WINDOW_MINUTES';

export const PLATFORM_ACTION_EXECUTOR_ENABLED_KEY =
  'PLATFORM_ACTION_EXECUTOR_ENABLED';

/** Retention placeholder for platform_event_records (days). Not enforced in v1. */
export const PLATFORM_EVENT_RECORD_RETENTION_DAYS_KEY =
  'PLATFORM_EVENT_RECORD_RETENTION_DAYS';

/** `off` (default) | `warn` (log missing fields) | `strict` (throw on errors). */
export type PlatformEventEnvelopeValidationMode = 'off' | 'warn' | 'strict';

export const PLATFORM_EVENT_ENVELOPE_VALIDATION_MODES = [
  'off',
  'warn',
  'strict',
] as const;
