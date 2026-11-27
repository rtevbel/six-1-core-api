import {
  PlannerPlanningPhase,
  PlannerProcessRunAction,
  ScenarioPlanningKind,
} from '../constants';

export interface PlannerTaskSplitPartView {
  taskId: number;
  plannedStartUtc: string;
  plannedEndUtc: string;
}

export interface PlannerTaskSplitView {
  revision: number;
  scheduleScenarioId: number;
  original: PlannerTaskSplitPartView;
  created: PlannerTaskSplitPartView;
}

export interface PlannerTaskMergeView {
  revision: number;
  scheduleScenarioId: number;
  keepTaskId: number;
  absorbTaskId: number;
  plannedStartUtc: string;
  plannedEndUtc: string;
}

export interface PlannerDependencySetView {
  revision: number;
  scheduleScenarioId: number;
  fromTaskId: number;
  toTaskId: number;
  dependencyType: string;
  lagDays: number;
}

export interface PlannerPhaseDockPhaseView {
  id: PlannerPlanningPhase;
  label: string;
  taskCount: number;
}

export interface PlannerDockTemplateView {
  templateId: string;
  phase: PlannerPlanningPhase;
  title: string;
  defaultDurHours: number;
  planningKind: ScenarioPlanningKind;
}

export interface PlannerPhaseDockTaskView {
  taskId: number;
  name: string;
  projectId: number | null;
  planningPhase: PlannerPlanningPhase;
  plannedStartUtc: string | null;
  plannedEndUtc: string | null;
}

export interface PlannerPhaseDockView {
  tenantId: number;
  scheduleScenarioId: number;
  revision: number;
  phases: PlannerPhaseDockPhaseView[];
  templates: PlannerDockTemplateView[];
  tasksByPhase: Record<PlannerPlanningPhase, PlannerPhaseDockTaskView[]>;
}

export interface PlannerDockTemplateApplyView {
  revision: number;
  scheduleScenarioId: number;
  taskId: number;
  plannedStartUtc: string;
  plannedEndUtc: string;
  planningPhase: PlannerPlanningPhase;
  templateId: string;
}

export interface PlannerProcessRunView {
  id: string;
  action: PlannerProcessRunAction;
  label: string;
  taskId: number | null;
  projectId: number | null;
  at: string;
  actorId: number | null;
  status: 'ok' | 'warn';
}

export interface PlannerProcessRunsListView {
  scheduleScenarioId: number;
  revision: number;
  items: PlannerProcessRunView[];
}

export interface PlannerProcessRunAppendView {
  revision: number;
  scheduleScenarioId: number;
  run: PlannerProcessRunView;
}
