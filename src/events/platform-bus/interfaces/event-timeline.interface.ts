import type { PlatformEventRecordStatus } from '../entities/platform_event_record.entity';

export type EventTimelineEntryKind =
  | 'platform_event'
  | 'action_execution'
  | 'notification_dispatch'
  | 'notification_delivery';

export interface PlatformEventTimelineEntry {
  kind: 'platform_event';
  occurredAt: string;
  recordId: number;
  eventName: string;
  tenantId?: number | null;
  correlationId?: string | null;
  causationId?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  status: PlatformEventRecordStatus;
  payload?: Record<string, unknown> | null;
}

export interface ActionExecutionTimelineEntry {
  kind: 'action_execution';
  occurredAt: string;
  executionId: number;
  eventRecordId: number;
  actionId: number;
  actionName?: string;
  actionType?: string;
  status: 'pending' | 'succeeded' | 'failed';
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  parentEventName?: string;
}

export interface NotificationDispatchTimelineEntry {
  kind: 'notification_dispatch';
  occurredAt: string;
  eventLogId: number;
  userId: number;
  eventId: number;
  eventName?: string;
  channelId?: number;
  templateId?: number;
  ruleId?: number;
}

export interface NotificationDeliveryTimelineEntry {
  kind: 'notification_delivery';
  occurredAt: string;
  notificationId: number;
  userId: number;
  type: string;
  status: string;
  logId?: number;
  deliveryStatus?: string;
  channelId?: number;
}

export type EventTimelineEntry =
  | PlatformEventTimelineEntry
  | ActionExecutionTimelineEntry
  | NotificationDispatchTimelineEntry
  | NotificationDeliveryTimelineEntry;

export interface EventTimelineResult {
  correlationId?: string;
  tenantId?: number;
  entityType?: string;
  entityId?: number;
  entries: EventTimelineEntry[];
  summary: {
    platformEventCount: number;
    actionExecutionCount: number;
    notificationDispatchCount: number;
    notificationDeliveryCount: number;
  };
}

export interface PlatformEventRecordFindAllResult {
  items: Array<{
    recordId: number;
    eventName: string;
    tenantId?: number | null;
    correlationId?: string | null;
    causationId?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    status: PlatformEventRecordStatus;
    payload?: Record<string, unknown> | null;
    occurredAt: Date;
    createdAt: Date;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
