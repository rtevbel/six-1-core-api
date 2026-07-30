import type { RuntimeV2ListPagination } from '../../common/runtime-v2-list-pagination';

/**
 * Public contract for a single config audit log row (Object Designer history).
 */
export interface ConfigAuditLogListItem {
  configAuditLogId: number;
  tenantId: number | null;
  entityType: string;
  entityId: number;
  action: 'create' | 'update' | 'delete';
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: number;
  changedByDisplayName: string | null;
  changedAt: string;
}

/**
 * Paginated list result for `listConfigAuditLogs`.
 */
export interface ConfigAuditLogListResult {
  items: ConfigAuditLogListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
