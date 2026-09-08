import {
  ConstraintConflictCode,
  ConstraintSeverity,
} from './constraint.codes';

export interface UtcInterval {
  startUtc: Date;
  endUtc: Date;
}

export interface ConstraintConflict {
  code: ConstraintConflictCode;
  severity: ConstraintSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface FittedWindow {
  effectiveStartUtc: Date;
  effectiveEndUtc: Date;
  tzUsed: string;
  dependencyGateUtc?: Date | null;
}

export interface ConstraintResult {
  ok: boolean;
  hard: ConstraintConflict[];
  soft: ConstraintConflict[];
  fitted?: FittedWindow;
}

export type PlacementMode = 'parent_window' | 'shift' | 'assignment';

export interface PlacementRequest {
  tenantId: number;
  taskId?: number;
  tenantUserId?: number | null;
  resourceId?: number | null;
  startUtc: Date;
  endUtc: Date;
  /** Exclude these live schedule rows from overlap checks (e.g. self on reschedule). */
  excludeScheduledTaskIds?: number[];
  teamId?: number | null;
  mode?: PlacementMode;
  /** Optional planning horizon for OUTSIDE_HORIZON checks. */
  horizonStartUtc?: Date;
  horizonEndUtc?: Date;
  /** When false, soft conflicts do not affect ok (default true: ok = no hard). */
  failOnSoft?: boolean;
}

export interface FitWindowRequest {
  tenantId: number;
  tenantUserId?: number | null;
  requestedStartUtc: Date;
  requestedEndUtc?: Date;
  /** Duration in ms; used when end is omitted or for fixed_duration recalculation. */
  durationMs?: number;
  taskId?: number;
  applyDependencyGate?: boolean;
  applyTaskConstraints?: boolean;
}

export interface UtilizationQuery {
  tenantId: number;
  fromUtc: Date;
  toUtc: Date;
  resourceIds?: number[];
  tenantUserIds?: number[];
  teamId?: number;
}

export interface UtilizationBucket {
  subjectType: 'user' | 'equipment' | 'team';
  subjectId: number;
  availableMs: number;
  busyMs: number;
  utilizationRatio: number;
}

export interface UtilizationResult {
  fromUtc: Date;
  toUtc: Date;
  buckets: UtilizationBucket[];
}

export interface ConflictQuery {
  tenantId: number;
  placements: Array<{
    key?: string;
    tenantUserId?: number | null;
    resourceId?: number | null;
    taskId?: number;
    startUtc: Date;
    endUtc: Date;
    excludeScheduledTaskIds?: number[];
  }>;
}
