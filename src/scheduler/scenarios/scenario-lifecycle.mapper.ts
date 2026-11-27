import { createHash } from 'crypto';
import { RpcException } from '@nestjs/microservices';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { ScheduleScenarioVersionEntity } from '../entities/schedule_scenario_version.entity';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import {
  ScheduleScenarioView,
  ScheduleScenarioVersionDetailView,
  ScheduleScenarioVersionSummaryView,
  ScenarioOverlayJson,
} from '../interfaces/schedule-scenario-lifecycle.interface';

export function throwVersionConflict(): never {
  throw new RpcException({
    statusCode: 409,
    message: 'Scenario revision conflict; reload and retry',
    errorCode: 'version_conflict',
  });
}

export function assertExpectedRevision(
  scenario: ScheduleScenarioEntity,
  expectedRevision?: number,
): void {
  if (
    expectedRevision != null &&
    scenario.revision !== expectedRevision
  ) {
    throwVersionConflict();
  }
}

export function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function mapScenarioView(
  scenario: ScheduleScenarioEntity,
  extras?: { definitiveScenarioId?: number | null },
): ScheduleScenarioView {
  return {
    scheduleScenarioId: scenario.scheduleScenarioId,
    schedulingRequirementId: scenario.schedulingRequirementId,
    tenantId: scenario.tenantId,
    name: scenario.name,
    notes: scenario.notes,
    status: scenario.status,
    parentScenarioId: scenario.parentScenarioId,
    revision: scenario.revision,
    basedOnLiveAt: toIso(scenario.basedOnLiveAt),
    promotedAt: toIso(scenario.promotedAt),
    promotedBy: scenario.promotedBy,
    createdBy: scenario.createdBy,
    createdAt: toIso(scenario.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(scenario.updatedAt) ?? new Date(0).toISOString(),
    ...(extras && 'definitiveScenarioId' in extras
      ? { definitiveScenarioId: extras.definitiveScenarioId ?? null }
      : {}),
  };
}

export function mapVersionSummary(
  row: ScheduleScenarioVersionEntity,
): ScheduleScenarioVersionSummaryView {
  return {
    scheduleScenarioVersionId: row.scheduleScenarioVersionId,
    scheduleScenarioId: row.scheduleScenarioId,
    tenantId: row.tenantId,
    version: row.version,
    summary: row.summary,
    contentHash: row.contentHash,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapVersionDetail(
  row: ScheduleScenarioVersionEntity,
): ScheduleScenarioVersionDetailView {
  return {
    ...mapVersionSummary(row),
    overlayJson: row.overlayJson ?? {},
  };
}

export function buildOverlayFromPlannedTasks(
  plannedTasks: ScenarioPlannedTaskEntity[],
  manageRecords?: ScenarioOverlayJson['manageRecords'],
  processRuns?: ScenarioOverlayJson['processRuns'],
): ScenarioOverlayJson {
  const overlay: ScenarioOverlayJson = {
    plannedTasks: plannedTasks.map((t) => ({
      taskId: t.taskId,
      plannedStartUtc: t.plannedStartUtc.toISOString(),
      plannedEndUtc: t.plannedEndUtc.toISOString(),
      tzUsed: t.tzUsed,
      priority: t.priority,
      taskStatusId: t.taskStatusId,
      notes: t.notes,
      constraintSnapshot: t.constraintSnapshot,
      conflictSummary: t.conflictSummary,
      isPlanned: t.isPlanned,
      isReady: t.isReady,
      readyPct: t.readyPct ?? 0,
      isMilestone: t.isMilestone,
      planningKind: t.planningKind,
      planningPhase: t.planningPhase ?? 'plan',
      baselineStartUtc: toIso(t.baselineStartUtc),
      baselineEndUtc: toIso(t.baselineEndUtc),
      deadlineUtc: toIso(t.deadlineUtc),
      sheetExtras: t.sheetExtras ?? null,
      shifts: (t.shifts ?? []).map((s) => ({
        sequenceNo: s.sequenceNo,
        tenantUserId: s.tenantUserId,
        resourceId: s.resourceId,
        plannedStartUtc: s.plannedStartUtc.toISOString(),
        plannedEndUtc: s.plannedEndUtc.toISOString(),
      })),
      assignments: (t.assignments ?? []).map((a) => ({
        resourceId: a.resourceId,
        assignedStart: a.assignedStart.toISOString(),
        assignedEnd: a.assignedEnd.toISOString(),
        scenarioPlannedShiftId: a.scenarioPlannedShiftId,
      })),
    })),
  };
  if (manageRecords && manageRecords.length > 0) {
    overlay.manageRecords = manageRecords;
  }
  if (processRuns && processRuns.length > 0) {
    overlay.processRuns = processRuns;
  }
  return overlay;
}

export function hashOverlay(overlay: ScenarioOverlayJson): string {
  return createHash('sha256')
    .update(JSON.stringify(overlay))
    .digest('hex');
}

export function parseOverlayJson(
  raw: Record<string, unknown> | ScenarioOverlayJson | null | undefined,
): ScenarioOverlayJson {
  if (!raw || typeof raw !== 'object') {
    return { plannedTasks: [] };
  }
  const plannedTasks = Array.isArray((raw as ScenarioOverlayJson).plannedTasks)
    ? (raw as ScenarioOverlayJson).plannedTasks
    : [];
  const manageRecords = Array.isArray(
    (raw as ScenarioOverlayJson).manageRecords,
  )
    ? (raw as ScenarioOverlayJson).manageRecords
    : undefined;
  const processRuns = Array.isArray((raw as ScenarioOverlayJson).processRuns)
    ? (raw as ScenarioOverlayJson).processRuns
    : undefined;
  const overlay: ScenarioOverlayJson = { plannedTasks };
  if (manageRecords?.length) overlay.manageRecords = manageRecords;
  if (processRuns?.length) overlay.processRuns = processRuns;
  return overlay;
}
