import {
  DEPRECATED_NOTIFICATION_TO_CANONICAL,
  isDeprecatedNotificationEventName,
  resolveDeprecatedNotificationEventName,
} from './constants/platform-event-names.constants';

export {
  DEPRECATED_NOTIFICATION_TO_CANONICAL,
  isDeprecatedNotificationEventName,
  resolveDeprecatedNotificationEventName,
};

export interface DeprecatedEventEmitWarning {
  deprecatedName: string;
  canonicalName: string;
  message: string;
}

/**
 * Returns a warning payload when `eventName` uses the deprecated notification prefix.
 */
export function getDeprecatedEventEmitWarning(
  eventName: string,
): DeprecatedEventEmitWarning | null {
  if (!isDeprecatedNotificationEventName(eventName)) {
    return null;
  }

  const canonicalName = resolveDeprecatedNotificationEventName(eventName);
  return {
    deprecatedName: eventName,
    canonicalName,
    message: `Deprecated event name "${eventName}" — emit "${canonicalName}" instead`,
  };
}
