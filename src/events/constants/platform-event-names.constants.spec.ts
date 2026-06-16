import {
  DEPRECATED_NOTIFICATION_TO_CANONICAL,
  isDeprecatedNotificationEventName,
  NOTIFICATION_ROUTED_CANONICAL_EVENTS,
  PLATFORM_EVENT_NAMES,
  resolveDeprecatedNotificationEventName,
  shouldCreateNotificationEventLog,
} from './constants/platform-event-names.constants';

describe('platform-event-names.constants', () => {
  it('maps deprecated notification names to canonical names', () => {
    expect(
      resolveDeprecatedNotificationEventName(
        'six1-event.notification.project_created',
      ),
    ).toBe(PLATFORM_EVENT_NAMES.PROJECT_CREATED);
    expect(
      resolveDeprecatedNotificationEventName(
        'six1-event.notification.process_step_completed',
      ),
    ).toBe(PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED);
  });

  it('routes manual process_step_completed to notifications only', () => {
    expect(
      shouldCreateNotificationEventLog(
        PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
        { cause: 'manual' },
      ),
    ).toBe(true);
    expect(
      shouldCreateNotificationEventLog(
        PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
        { cause: 'event' },
      ),
    ).toBe(false);
  });

  it('identifies deprecated notification prefix', () => {
    expect(
      isDeprecatedNotificationEventName(
        'six1-event.notification.task_status_changed',
      ),
    ).toBe(true);
    expect(isDeprecatedNotificationEventName('six1-event.project_created')).toBe(
      false,
    );
  });

  it('lists all deprecated shims in the canonical map', () => {
    expect(Object.keys(DEPRECATED_NOTIFICATION_TO_CANONICAL)).toHaveLength(4);
    for (const canonical of Object.values(DEPRECATED_NOTIFICATION_TO_CANONICAL)) {
      expect(NOTIFICATION_ROUTED_CANONICAL_EVENTS.has(canonical)).toBe(true);
    }
  });
});
