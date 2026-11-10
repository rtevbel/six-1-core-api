import { ScenarioPlanningKind } from '../constants';
import { ConstraintConflict } from '../constraints/constraint.types';
import {
  PlannerAttention,
  PlannerScale,
  PlannerView,
} from '../dto/planner-read.dto';
import { PlannerSheetExtras } from './planner-sheet-extras.interface';

export interface PlannerBoardProjectChildView {
  taskId: number;
  name: string;
  isMilestone: boolean;
  isPlanned: boolean;
  issues: string[];
}

export interface PlannerBoardProjectView {
  projectId: number;
  name: string;
  children: PlannerBoardProjectChildView[];
}

export interface PlannerBoardLaneView {
  laneKey: string;
  subjectType: 'user' | 'equipment' | 'unassigned';
  subjectId: number | null;
  label: string;
  utilizationRatio: number;
  overloaded: boolean;
}

export interface PlannerBoardBarView {
  barId: string;
  taskId: number;
  projectId: number | null;
  label: string;
  laneKeys: string[];
  startUtc: string | null;
  endUtc: string | null;
  isPlanned: boolean;
  isMilestone: boolean;
  /** Overlay planning kind for task-sheet hydrate (Week 8+). */
  planningKind: ScenarioPlanningKind;
  /** ISO deadline or null. */
  deadlineUtc: string | null;
  /** Rich sheet extras for reopen without session cache; null when unset. */
  sheetExtras: PlannerSheetExtras | null;
  issues: string[];
  attention: PlannerAttention | 'ok';
}

export interface PlannerBoardDepView {
  fromTaskId: number;
  toTaskId: number;
  dependencyType: string;
  /** Overlay lag days when from sheet extras; else 0. */
  lagDays?: number;
}

export interface PlannerBoardView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number | null;
  revision: number | null;
  scale: PlannerScale;
  rangeStart: string;
  rangeEnd: string;
  view: PlannerView;
  projects: PlannerBoardProjectView[];
  resourceLanes: PlannerBoardLaneView[];
  bars: PlannerBoardBarView[];
  deps: PlannerBoardDepView[];
  conflictSummary: { hard: number; soft: number };
}

export interface PlannerKpisView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number | null;
  rangeStart: string;
  rangeEnd: string;
  capacityPressure: {
    periodUtil: number;
    peakUtil: number;
    overloadedResourceCount: number;
  };
  toScheduleCount: number;
  needsAttentionCount: number;
  criticalPathCount: number;
  startsInPeriodCount: number;
  blockersCount: number;
  conflictCount: number;
  criticalPathRiskCount: number;
  replanningRequiredCount: number;
  shiftedCount: number;
}

export interface PlannerConflictsView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number | null;
  count: number;
  conflicts: ConstraintConflict[];
}

export type PlannerQueueReasonCode = 'unplanned' | 'unassigned' | 'no_date';

export interface PlannerQueueItemView {
  taskId: number;
  taskName: string;
  projectId: number | null;
  projectName: string | null;
  reason: PlannerQueueReasonCode;
  plannedStartUtc: string | null;
  plannedEndUtc: string | null;
  tenantUserId: number | null;
  isPlanned: boolean;
}

export interface PlannerQueueView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number | null;
  revision: number | null;
  items: PlannerQueueItemView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
