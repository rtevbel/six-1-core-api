import { ScheduleScenarioStatus, ScenarioPlanningKind } from '../constants';
import type { RuntimeV2ListPagination } from '../../common/runtime-v2-list-pagination';

/** Public scenario view over RMQ (never raw TypeORM entity). */
export interface ScheduleScenarioView {
  scheduleScenarioId: number;
  schedulingRequirementId: number;
  tenantId: number;
  name: string;
  notes: string | null;
  status: ScheduleScenarioStatus;
  parentScenarioId: number | null;
  revision: number;
  basedOnLiveAt: string | null;
  promotedAt: string | null;
  promotedBy: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  definitiveScenarioId?: number | null;
}

export interface ScheduleScenarioVersionSummaryView {
  scheduleScenarioVersionId: number;
  scheduleScenarioId: number;
  tenantId: number;
  version: number;
  summary: string;
  contentHash: string;
  createdBy: number | null;
  createdAt: string;
}

export interface ScheduleScenarioVersionDetailView
  extends ScheduleScenarioVersionSummaryView {
  overlayJson: Record<string, unknown>;
}

export interface SaveScheduleScenarioResult {
  scenario: ScheduleScenarioView;
  version: ScheduleScenarioVersionSummaryView;
}

export interface RestoreScheduleScenarioVersionResult {
  scenario: ScheduleScenarioView;
  restoredFromVersion: number;
  version: ScheduleScenarioVersionSummaryView;
}

export interface ListScheduleScenarioVersionsResult {
  items: ScheduleScenarioVersionSummaryView[];
  pagination: RuntimeV2ListPagination;
}

/** Overlay blob stored in schedule_scenario_versions.overlay_json */
export interface ScenarioOverlayJson {
  plannedTasks: ScenarioOverlayPlannedTask[];
}

export interface ScenarioOverlayPlannedTask {
  taskId: number;
  plannedStartUtc: string;
  plannedEndUtc: string;
  tzUsed?: string;
  priority?: number;
  taskStatusId?: number | null;
  notes?: string | null;
  constraintSnapshot?: Record<string, unknown> | null;
  conflictSummary?: Record<string, unknown> | null;
  isPlanned?: boolean;
  isReady?: boolean;
  isMilestone?: boolean;
  planningKind?: ScenarioPlanningKind;
  baselineStartUtc?: string | null;
  baselineEndUtc?: string | null;
  deadlineUtc?: string | null;
  shifts?: Array<{
    sequenceNo: number;
    tenantUserId?: number | null;
    resourceId?: number | null;
    plannedStartUtc: string;
    plannedEndUtc: string;
  }>;
  assignments?: Array<{
    resourceId: number;
    assignedStart: string;
    assignedEnd: string;
    scenarioPlannedShiftId?: number | null;
  }>;
}
