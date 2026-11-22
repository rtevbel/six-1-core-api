export type PlannerNotifyEventType =
  | 'scheduler.scenario.updated'
  | 'scheduler.scenario.promoted'
  | 'scheduler.conflicts.changed';

/** Optional hint for FE query invalidation; unknown values → refetch all scenario reads. */
export type PlannerNotifyCause =
  | 'task_upsert'
  | 'task_remove'
  | 'impact_apply'
  | 'manage_upsert'
  | 'manage_remove'
  | 'save'
  | 'definitive'
  | 'restore'
  | 'ui_prefs'
  | 'promote'
  | 'conflicts';

/** Notify-only payload published to Redis for Gateway SSE. */
export interface PlannerNotifyPayload {
  type: PlannerNotifyEventType;
  tenantId: number;
  requirementId: number;
  scenarioId: number | null;
  revision?: number | null;
  changedAt: string;
  actorId?: number | null;
  count?: number;
  cause?: PlannerNotifyCause;
}
