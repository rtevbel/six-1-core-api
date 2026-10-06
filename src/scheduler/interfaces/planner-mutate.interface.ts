import { ConstraintConflict } from '../constraints/constraint.types';
import { ScenarioPlanningKind } from '../constants';

export interface PlannerPlannedTaskView {
  scenarioPlannedTaskId: number;
  taskId: number;
  plannedStartUtc: string;
  plannedEndUtc: string;
  tzUsed: string;
  tenantUserId: number | null;
  resourceId: number | null;
  planningKind: ScenarioPlanningKind;
  deadlineUtc: string | null;
  notes: string | null;
  isPlanned: boolean;
  isReady: boolean;
  isMilestone: boolean;
  priority: number;
  taskStatusId: number | null;
}

export interface PlannerConflictSummary {
  hard: number;
  soft: number;
}

export interface PlannerTaskUpsertView {
  tenantId: number;
  scheduleScenarioId: number;
  taskId: number;
  revision: number;
  plannedTask: PlannerPlannedTaskView;
  conflicts: ConstraintConflict[];
  conflictSummary: PlannerConflictSummary;
}

export interface PlannerTaskRemoveView {
  removed: boolean;
  revision: number;
  scheduleScenarioId: number;
  taskId: number;
}

export interface PlannerAssessView {
  tenantId: number;
  scheduleScenarioId: number;
  taskId: number;
  ok: boolean;
  conflicts: ConstraintConflict[];
  conflictSummary: PlannerConflictSummary;
}

export interface PlannerSuggestSlotView {
  startUtc: string;
  endUtc: string;
  tenantUserId: number | null;
  resourceId: number | null;
  hardCount: number;
  softCount: number;
}

export interface PlannerSuggestView {
  tenantId: number;
  scheduleScenarioId: number;
  taskId: number;
  slots: PlannerSuggestSlotView[];
}
