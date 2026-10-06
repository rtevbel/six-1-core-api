import { ConstraintConflict } from '../constraints/constraint.types';
import {
  PlannerAttention,
  PlannerScale,
  PlannerView,
} from '../dto/planner-read.dto';

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
  issues: string[];
  attention: PlannerAttention | 'ok';
}

export interface PlannerBoardDepView {
  fromTaskId: number;
  toTaskId: number;
  dependencyType: string;
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
