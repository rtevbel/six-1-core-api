import { EventNotificationRuleEntity } from '../entities/event_notification_rule.entity';
import type { RuntimeV2ListPagination } from '../../../common/runtime-v2-list-pagination';

export interface FindAllResultInterface {
  items: EventNotificationRuleEntity[];
  eventNotificationRuleRecords: EventNotificationRuleEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
