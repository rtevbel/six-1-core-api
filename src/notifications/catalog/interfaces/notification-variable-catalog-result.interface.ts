import type {
  NotificationVariableCatalogEntry,
  NotificationVariableGroup,
} from '../../context/notification-namespace.manifest';

export interface NotificationVariableCatalogResult {
  eventName: string | null;
  objectType: string | null;
  processTemplateId: number | null;
  entries: NotificationVariableCatalogEntry[];
  grouped: Record<NotificationVariableGroup, NotificationVariableCatalogEntry[]>;
}
