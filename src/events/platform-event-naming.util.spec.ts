import { getDeprecatedEventEmitWarning } from './platform-event-naming.util';
import { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';

describe('platform-event-naming.util', () => {
  it('returns warning for deprecated notification event names', () => {
    expect(
      getDeprecatedEventEmitWarning('six1-event.notification.project_created'),
    ).toEqual({
      deprecatedName: 'six1-event.notification.project_created',
      canonicalName: PLATFORM_EVENT_NAMES.PROJECT_CREATED,
      message:
        'Deprecated event name "six1-event.notification.project_created" — emit "six1-event.project_created" instead',
    });
  });

  it('returns null for canonical names', () => {
    expect(
      getDeprecatedEventEmitWarning(PLATFORM_EVENT_NAMES.PROJECT_CREATED),
    ).toBeNull();
  });
});
