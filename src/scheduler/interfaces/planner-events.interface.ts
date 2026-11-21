export type PlannerNotifyEventType =
  | 'scheduler.scenario.updated'
  | 'scheduler.scenario.promoted'
  | 'scheduler.conflicts.changed';

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
}
