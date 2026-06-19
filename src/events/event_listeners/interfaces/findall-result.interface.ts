import { EventListenerEntity } from '../entities/event_listener.entity';
import type { EventNotificationRuleEntity } from '../../event_notification_rules/entities/event_notification_rule.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: EventListenerEntity[];
  eventListenerRecords: EventListenerEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  /** True while `event_listeners` RPCs remain for backward compatibility. */
  deprecated?: boolean;
  deprecationMessage?: string;
  /** Equivalent `event_notification_rules` rows when `includeNotificationRules` is set. */
  notificationRuleRecords?: EventNotificationRuleEntity[];
}
