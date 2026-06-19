/** Shown in API responses and logs while `event_listeners` is phased out. */
export const EVENT_LISTENERS_DEPRECATED_MESSAGE =
  'event_listeners is deprecated; use event_notification_rules (v0.1_*_event_notification_rule*).';

export const EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE =
  'Creating or updating event_listeners is disabled (PLATFORM_EVENT_LISTENERS_WRITE_DISABLED=true); use event_notification_rules.';

export const BIND_NOTIFICATION_TEMPLATE_DEPRECATED_MESSAGE =
  'v0.1_bind_notification_template is deprecated; use v0.1_create_event_notification_rule or v0.1_update_event_notification_rule.';
