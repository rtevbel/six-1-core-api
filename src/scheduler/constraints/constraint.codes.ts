/**
 * Stable conflict codes for planner + live scheduling.
 * Treat as a public contract — additive only.
 */
export const ConstraintConflictCode = {
  CALENDAR_CLOSED: 'CALENDAR_CLOSED',
  USER_OVERLAP: 'USER_OVERLAP',
  EQUIPMENT_OVERLAP: 'EQUIPMENT_OVERLAP',
  RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',
  RESOURCE_BLACKOUT: 'RESOURCE_BLACKOUT',
  AVAILABILITY_RULE_UNSUPPORTED: 'AVAILABILITY_RULE_UNSUPPORTED',
  DEPENDENCY_GATE: 'DEPENDENCY_GATE',
  TASK_CONSTRAINT: 'TASK_CONSTRAINT',
  META_RULE: 'META_RULE',
  TEAM_OVERLOAD: 'TEAM_OVERLOAD',
  OUTSIDE_HORIZON: 'OUTSIDE_HORIZON',
  INVALID_WINDOW: 'INVALID_WINDOW',
} as const;

export type ConstraintConflictCode =
  (typeof ConstraintConflictCode)[keyof typeof ConstraintConflictCode];

export type ConstraintSeverity = 'hard' | 'soft';
