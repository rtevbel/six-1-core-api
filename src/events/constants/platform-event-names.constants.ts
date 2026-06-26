/**
 * Canonical platform event names (P0.4).
 * Producers must use these constants — not `six1-event.notification.*`.
 * @see docs/platform-event-catalog.md
 */
export const PLATFORM_EVENT_PREFIX = 'six1-event.';

export const DEPRECATED_NOTIFICATION_EVENT_PREFIX = 'six1-event.notification.';

export const PLATFORM_EVENT_NAMES = {
  PROCESS_STARTED: 'six1-event.process_started',
  PROCESS_STEP_READY: 'six1-event.process_step_ready',
  PROCESS_STEP_STARTED: 'six1-event.process_step_started',
  PROCESS_STEP_COMPLETED: 'six1-event.process_step_completed',
  PROCESS_COMPLETED: 'six1-event.process_completed',
  PROCESS_CHILD_STARTED: 'six1-event.process_child_started',
  PROCESS_CHILD_COMPLETED: 'six1-event.process_child_completed',
  PROCESS_CHILD_CANCELED: 'six1-event.process_child_canceled',
  PROCESS_STEP_TASK_CREATED: 'six1-event.process_step_task_created',
  PROCESS_STEP_OBJECT_CREATED: 'six1-event.process_step_object_created',
  PROCESS_STEP_OBJECT_VALIDATED: 'six1-event.process_step_object_validated',
  CONFIG_OBJECT_INSTANCE_UPDATED: 'six1-event.config_object_instance.updated',
  CONFIG_OBJECT_INSTANCE_CREATED: 'six1-event.config_object_instance.created',
  CONFIG_OBJECT_INSTANCE_DELETED: 'six1-event.config_object_instance.deleted',
  SOR_BOUND_INSTANCE_UPDATED: 'six1-event.sor_bound_instance.updated',
  SYSTEM_ENTITY_UPDATED: 'six1-event.system_entity.updated',
  PROJECT_CREATED: 'six1-event.project_created',
  PROJECT_STATUS_CHANGED: 'six1-event.project_status_changed',
  TASK_STATUS_CHANGED: 'six1-event.task_status_changed',
  TENANT_CREATED: 'six1-event.tenant.created',
  TENANT_EMAIL_VERIFICATION_REQUESTED:
    'six1-event.tenant.email_verification_requested',
  TENANT_EMAIL_VERIFIED: 'six1-event.tenant.email_verified',
} as const;

export type PlatformEventName =
  (typeof PLATFORM_EVENT_NAMES)[keyof typeof PLATFORM_EVENT_NAMES];

/**
 * Deprecated `six1-event.notification.*` → canonical `six1-event.*` mapping.
 */
export const DEPRECATED_NOTIFICATION_TO_CANONICAL: Record<string, string> = {
  'six1-event.notification.project_created':
    PLATFORM_EVENT_NAMES.PROJECT_CREATED,
  'six1-event.notification.project_status_changed':
    PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED,
  'six1-event.notification.task_status_changed':
    PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED,
  'six1-event.notification.process_step_completed':
    PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
};

/** Canonical events that create notification event logs via the event-log bridge. */
export const NOTIFICATION_ROUTED_CANONICAL_EVENTS = new Set<string>([
  PLATFORM_EVENT_NAMES.PROJECT_CREATED,
  PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED,
  PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED,
  PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
]);

export function isPlatformEventName(eventName: string): boolean {
  return eventName.trim().startsWith(PLATFORM_EVENT_PREFIX);
}

export function isDeprecatedNotificationEventName(eventName: string): boolean {
  return eventName.trim().startsWith(DEPRECATED_NOTIFICATION_EVENT_PREFIX);
}

/**
 * Resolves a deprecated notification-prefixed name to its canonical catalog name.
 */
export function resolveDeprecatedNotificationEventName(eventName: string): string {
  const trimmed = eventName.trim();
  return (
    DEPRECATED_NOTIFICATION_TO_CANONICAL[trimmed] ??
    trimmed.replace(DEPRECATED_NOTIFICATION_EVENT_PREFIX, PLATFORM_EVENT_PREFIX)
  );
}

/**
 * Whether a canonical emission should create an notification `event_log` row.
 * `process_step_completed` is notification-routed for manual completion only.
 */
export function shouldCreateNotificationEventLog(
  eventName: string,
  data?: unknown,
): boolean {
  if (!NOTIFICATION_ROUTED_CANONICAL_EVENTS.has(eventName)) {
    return false;
  }

  if (eventName === PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED) {
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    return payload.cause === 'manual';
  }

  return true;
}
