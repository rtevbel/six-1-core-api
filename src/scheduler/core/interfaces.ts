export interface CalendarProvider {
  /** Best timezone for schedule fitting (tenant-user > tenant > 'UTC') */
  getTimezone(tenantId: number, tenantUserId?: number): Promise<string>;

  /** Is this local date a day off for this tenant / user? (YYYY-MM-DD in local tz) */
  isOffDateLocal(
    tenantId: number,
    tenantUserId: number | undefined,
    isoDate: string,
  ): Promise<boolean>;

  /** Working time windows (local) for this weekday, e.g. [{start:'09:00',end:'13:00'}, ...] */
  getWorkingIntervalsLocal(
    tenantId: number,
    tenantUserId: number | undefined,
    isoDate: string, // 'YYYY-MM-DD'
    weekday: number, // 1=Mon..7=Sun (Luxon)
  ): Promise<Array<{ start: string; end: string }>>;
}

export type TaskStartConstraintType =
  | 'ASAP'
  | 'NoEarlierThan'
  | 'On'
  | 'NoLaterThan'
  | 'MustStartOn'
  | 'MustFinishOn';

export type TaskSchedulingMode = 'manual' | 'fixed_duration' | 'fixed_effort';

export interface TaskSchedulingContext {
  tenantId: number;
  projectId: number;
  taskStatusId: number;
  assigneeId: number | null;
  teamId: number | null;
  startConstraintType?: TaskStartConstraintType | null;
  startConstraintUtc?: Date | null;
  finishConstraintUtc?: Date | null;
  estimatedDuration?: number | null;
  effortHours?: number | null;
  schedulingMode?: TaskSchedulingMode;
  defaultShiftHours?: number | null;
}

export interface TaskContextProvider {
  /** Minimal context to scope calendar/ACL and constraints for a task */
  getTaskContext(taskId: number): Promise<TaskSchedulingContext>;
}
