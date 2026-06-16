/** Env key for Notification Variable Platform rollout (default: disabled). */
export const PLATFORM_NOTIFICATION_CONTEXT_ENABLED_KEY =
  'PLATFORM_NOTIFICATION_CONTEXT_ENABLED';

/** P8 — prepare + queue send immediately after event_log creation. */
export const PLATFORM_NOTIFICATION_IMMEDIATE_DISPATCH_ENABLED_KEY =
  'PLATFORM_NOTIFICATION_IMMEDIATE_DISPATCH_ENABLED';

/** Max outbound send attempts before dead-letter (P8). */
export const PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS_KEY =
  'PLATFORM_NOTIFICATION_MAX_SEND_ATTEMPTS';

/** Base backoff seconds for send retries (P8). */
export const PLATFORM_NOTIFICATION_RETRY_BASE_SECONDS_KEY =
  'PLATFORM_NOTIFICATION_RETRY_BASE_SECONDS';
