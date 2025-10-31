export const CALENDAR_PROVIDER = Symbol('CALENDAR_PROVIDER');
export const TASK_CONTEXT_PROVIDER = Symbol('TASK_CONTEXT_PROVIDER');

export interface CalendarProvider {
  /** Best timezone for schedule fitting (tenant-user > tenant > 'UTC') */
  getTimezone(tenantId: number, tenantUserId?: number): Promise<string>;

  /** Is this local date a day off for this tenant / user? (YYYY-MM-DD in local tz) */
  isOffDateLocal(tenantId: number, tenantUserId: number | undefined, isoDate: string): Promise<boolean>;

  /** Working time windows (local) for this weekday, e.g. [{start:'09:00',end:'13:00'}, ...] */
  getWorkingIntervalsLocal(
    tenantId: number,
    tenantUserId: number | undefined,
    isoDate: string,     // 'YYYY-MM-DD'
    weekday: number,     // 1=Mon..7=Sun (Luxon)
  ): Promise<Array<{ start: string; end: string }>>;
}

export interface TaskContextProvider {
  /** Minimal context to scope calendar/ACL and constraints for a task */
  getTaskContext(taskId: number): Promise<{
    tenantId: number;
    projectId: number;
    taskStatusId: number;
    assigneeId: number | null,
    // Optional: constraints from task
    startConstraintType?: 'ASAP'|'NoEarlierThan'|'On'|'NoLaterThan'|'MustStartOn'|'MustFinishOn'|null;
    startConstraintUtc?: Date|null;
    finishConstraintUtc?: Date|null;
  }>;
}
