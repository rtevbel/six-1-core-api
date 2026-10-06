import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { In, Repository } from 'typeorm';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import { ScheduleScenariosService } from '../scenarios/schedule-scenarios.service';
import { ScenarioPlanningService } from './scenario-planning.service';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { ConstraintConflictCode } from '../constraints/constraint.codes';
import { ConstraintConflict } from '../constraints/constraint.types';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { toIso } from '../scenarios/scenario-lifecycle.mapper';
import {
  PlannerAssessDto,
  PlannerSuggestDto,
  PlannerTaskRemoveDto,
  PlannerTaskUpsertDto,
} from '../dto/planner-mutate.dto';
import {
  PlannerAssessView,
  PlannerConflictSummary,
  PlannerPlannedTaskView,
  PlannerSuggestSlotView,
  PlannerSuggestView,
  PlannerTaskRemoveView,
  PlannerTaskUpsertView,
} from '../interfaces/planner-mutate.interface';

const DEFAULT_SEARCH_DAYS = 14;
const DEFAULT_SLOT_LIMIT = 10;
const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;
const SLOT_HOURS_UTC = [8, 9, 10, 13, 14];

/**
 * Planner mutate APIs for task sheet (Week 5): upsert, assess, suggest.
 */
@Injectable()
export class PlannerMutateService {
  constructor(
    private readonly tenantUsers: TenantUsersService,
    private readonly requirements: SchedulingRequirementsService,
    private readonly scenarios: ScheduleScenariosService,
    private readonly planning: ScenarioPlanningService,
    private readonly constraints: ConstraintCapacityEngine,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  async upsertTask(
    userId: number,
    dto: PlannerTaskUpsertDto,
  ): Promise<PlannerTaskUpsertView> {
    const start = new Date(dto.plannedStartUtc);
    const end = new Date(dto.plannedEndUtc);
    const shifts =
      dto.tenantUserId != null || dto.resourceId != null
        ? [
            {
              sequenceNo: 1,
              tenantUserId: dto.tenantUserId ?? null,
              resourceId: dto.resourceId ?? null,
              plannedStartUtc: start,
              plannedEndUtc: end,
            },
          ]
        : undefined;

    const result = await this.planning.upsertPlannedTask(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      plannedStartUtc: start,
      plannedEndUtc: end,
      tzUsed: dto.tzUsed,
      priority: dto.priority,
      taskStatusId: dto.taskStatusId,
      notes: dto.notes,
      planningKind: dto.planningKind,
      deadlineUtc:
        dto.deadlineUtc === undefined
          ? undefined
          : dto.deadlineUtc
            ? new Date(dto.deadlineUtc)
            : null,
      isPlanned: dto.isPlanned,
      isReady: dto.isReady,
      isMilestone: dto.isMilestone,
      taskName: dto.taskName,
      expectedRevision: dto.expectedRevision,
      shifts,
    });

    return {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      revision: result.revision,
      plannedTask: this.mapPlannedTaskView(result.plannedTask),
      conflicts: result.conflicts,
      conflictSummary: this.summarize(result.conflicts),
    };
  }

  async removeTask(
    userId: number,
    dto: PlannerTaskRemoveDto,
  ): Promise<PlannerTaskRemoveView> {
    const result = await this.planning.removePlannedTask(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      expectedRevision: dto.expectedRevision,
    });
    return {
      removed: result.removed,
      revision: result.revision,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
    };
  }

  async assess(
    userId: number,
    dto: PlannerAssessDto,
  ): Promise<PlannerAssessView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.scenarios.findOne(
      userId,
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      dto.tenantId,
    );
    const plannedTasks = await this.planning.findPlannedTasks(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
    });

    const start = new Date(dto.plannedStartUtc);
    const end = new Date(dto.plannedEndUtc);
    const conflicts = await this.collectPlacementConflicts({
      tenantId: dto.tenantId,
      taskId: dto.taskId,
      start,
      end,
      tenantUserId: dto.tenantUserId ?? null,
      resourceId: dto.resourceId ?? null,
      horizonStartUtc: requirement.horizonStartUtc,
      horizonEndUtc: requirement.horizonEndUtc,
      plannedTasks,
      excludeTaskId: dto.taskId,
    });

    const summary = this.summarize(conflicts);
    return {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      ok: summary.hard === 0,
      conflicts,
      conflictSummary: summary,
    };
  }

  async suggest(
    userId: number,
    dto: PlannerSuggestDto,
  ): Promise<PlannerSuggestView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.scenarios.findOne(
      userId,
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      dto.tenantId,
    );
    const plannedTasks = await this.planning.findPlannedTasks(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
    });

    const durationMs = await this.resolveDurationMs(dto, plannedTasks);
    const searchDays = dto.searchDays ?? DEFAULT_SEARCH_DAYS;
    const limit = dto.limit ?? DEFAULT_SLOT_LIMIT;
    const searchStart = dto.searchStartUtc
      ? new Date(dto.searchStartUtc)
      : new Date();

    const candidates = await this.resolveCandidateAssignees(
      dto,
      plannedTasks,
      requirement.schedulingRequirementId,
    );

    const slots: PlannerSuggestSlotView[] = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (let day = 0; day < searchDays && slots.length < limit * 3; day++) {
      const dayBase = new Date(searchStart.getTime() + day * dayMs);
      for (const hour of SLOT_HOURS_UTC) {
        const start = new Date(
          Date.UTC(
            dayBase.getUTCFullYear(),
            dayBase.getUTCMonth(),
            dayBase.getUTCDate(),
            hour,
            0,
            0,
            0,
          ),
        );
        if (start < searchStart) continue;
        const end = new Date(start.getTime() + durationMs);
        if (
          requirement.horizonEndUtc &&
          end > new Date(requirement.horizonEndUtc)
        ) {
          continue;
        }

        for (const candidate of candidates) {
          if (slots.length >= limit * 3) break;
          const conflicts = await this.collectPlacementConflicts({
            tenantId: dto.tenantId,
            taskId: dto.taskId,
            start,
            end,
            tenantUserId: candidate.tenantUserId,
            resourceId: candidate.resourceId,
            horizonStartUtc: requirement.horizonStartUtc,
            horizonEndUtc: requirement.horizonEndUtc,
            plannedTasks,
            excludeTaskId: dto.taskId,
          });
          const summary = this.summarize(conflicts);
          if (summary.hard > 0) continue;
          slots.push({
            startUtc: start.toISOString(),
            endUtc: end.toISOString(),
            tenantUserId: candidate.tenantUserId,
            resourceId: candidate.resourceId,
            hardCount: summary.hard,
            softCount: summary.soft,
          });
        }
      }
    }

    slots.sort((a, b) => {
      if (a.softCount !== b.softCount) return a.softCount - b.softCount;
      return a.startUtc.localeCompare(b.startUtc);
    });

    return {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      slots: slots.slice(0, limit),
    };
  }

  private async resolveDurationMs(
    dto: PlannerSuggestDto,
    plannedTasks: ScenarioPlannedTaskEntity[],
  ): Promise<number> {
    if (dto.durationMs != null && dto.durationMs > 0) {
      return dto.durationMs;
    }
    const existing = plannedTasks.find((p) => p.taskId === dto.taskId);
    if (existing) {
      const ms =
        existing.plannedEndUtc.getTime() - existing.plannedStartUtc.getTime();
      if (ms > 0) return ms;
    }
    const task = await this.taskRepo.findOne({
      where: { taskId: dto.taskId, tenantId: dto.tenantId },
    });
    if (task?.estimatedDuration && Number(task.estimatedDuration) > 0) {
      return Number(task.estimatedDuration) * 60 * 1000;
    }
    return DEFAULT_DURATION_MS;
  }

  private async resolveCandidateAssignees(
    dto: PlannerSuggestDto,
    plannedTasks: ScenarioPlannedTaskEntity[],
    schedulingRequirementId: number,
  ): Promise<
    Array<{ tenantUserId: number | null; resourceId: number | null }>
  > {
    if (dto.tenantUserId != null || dto.resourceId != null) {
      return [
        {
          tenantUserId: dto.tenantUserId ?? null,
          resourceId: dto.resourceId ?? null,
        },
      ];
    }

    const userIds = new Set<number>();
    for (const pt of plannedTasks) {
      for (const shift of pt.shifts ?? []) {
        if (shift.tenantUserId != null) userIds.add(shift.tenantUserId);
      }
    }

    const requirementEntity = await this.requirements.findOneOrFail(
      schedulingRequirementId,
      dto.tenantId,
    );
    const scopedTaskIds =
      await this.requirements.resolveScopedTaskIds(requirementEntity);
    if (scopedTaskIds.length) {
      const tasks = await this.taskRepo.find({
        where: { tenantId: dto.tenantId, taskId: In(scopedTaskIds) },
      });
      for (const t of tasks) {
        if (t.primaryAssigneeId != null) userIds.add(t.primaryAssigneeId);
      }
    }

    const candidates: Array<{
      tenantUserId: number | null;
      resourceId: number | null;
    }> = [...userIds].map((tenantUserId) => ({
      tenantUserId,
      resourceId: null,
    }));
    if (!candidates.length) {
      candidates.push({ tenantUserId: null, resourceId: null });
    }
    return candidates;
  }

  private async collectPlacementConflicts(input: {
    tenantId: number;
    taskId: number;
    start: Date;
    end: Date;
    tenantUserId: number | null;
    resourceId: number | null;
    horizonStartUtc: Date;
    horizonEndUtc: Date;
    plannedTasks: ScenarioPlannedTaskEntity[];
    excludeTaskId: number;
  }): Promise<ConstraintConflict[]> {
    if (
      Number.isNaN(input.start.getTime()) ||
      Number.isNaN(input.end.getTime()) ||
      input.end.getTime() <= input.start.getTime()
    ) {
      throw new RpcException({
        statusCode: 400,
        message: 'plannedEndUtc must be after plannedStartUtc',
      });
    }

    const conflicts: ConstraintConflict[] = [];
    const parent = await this.constraints.validatePlacement({
      tenantId: input.tenantId,
      taskId: input.taskId,
      startUtc: input.start,
      endUtc: input.end,
      mode: 'parent_window',
      horizonStartUtc: input.horizonStartUtc,
      horizonEndUtc: input.horizonEndUtc,
    });
    conflicts.push(...parent.hard, ...parent.soft);

    if (input.tenantUserId == null && input.resourceId == null) {
      conflicts.push({
        code: ConstraintConflictCode.UNASSIGNED,
        severity: 'soft',
        message: 'Planned task has no assignee',
        details: { taskId: input.taskId },
      });
    } else {
      const scenarioBusy = this.buildScenarioBusy(
        input.plannedTasks,
        input.excludeTaskId,
      );
      const shift = await this.constraints.validatePlacement({
        tenantId: input.tenantId,
        taskId: input.taskId,
        tenantUserId: input.tenantUserId,
        resourceId: input.resourceId,
        startUtc: input.start,
        endUtc: input.end,
        mode: 'shift',
        horizonStartUtc: input.horizonStartUtc,
        horizonEndUtc: input.horizonEndUtc,
        useScenarioBusy: true,
        scenarioBusyIntervals: scenarioBusy,
        placementKey: `assess:${input.taskId}`,
      });
      conflicts.push(...shift.hard, ...shift.soft);
    }

    return conflicts;
  }

  private buildScenarioBusy(
    plannedTasks: ScenarioPlannedTaskEntity[],
    excludeTaskId: number,
  ) {
    const intervals: Array<{
      key: string;
      tenantUserId?: number | null;
      resourceId?: number | null;
      startUtc: Date;
      endUtc: Date;
    }> = [];
    for (const pt of plannedTasks) {
      if (pt.taskId === excludeTaskId) continue;
      for (const shift of pt.shifts ?? []) {
        intervals.push({
          key: `shift:${pt.taskId}:${shift.sequenceNo}`,
          tenantUserId: shift.tenantUserId,
          resourceId: shift.resourceId,
          startUtc: shift.plannedStartUtc,
          endUtc: shift.plannedEndUtc,
        });
      }
      for (const assignment of pt.assignments ?? []) {
        intervals.push({
          key: `assignment:${pt.taskId}:${assignment.resourceId}:${assignment.assignedStart.getTime()}`,
          resourceId: assignment.resourceId,
          startUtc: assignment.assignedStart,
          endUtc: assignment.assignedEnd,
        });
      }
    }
    return intervals;
  }

  private mapPlannedTaskView(
    row: ScenarioPlannedTaskEntity,
  ): PlannerPlannedTaskView {
    const shift = row.shifts?.[0];
    return {
      scenarioPlannedTaskId: row.scenarioPlannedTaskId,
      taskId: row.taskId,
      plannedStartUtc: toIso(row.plannedStartUtc) ?? new Date(0).toISOString(),
      plannedEndUtc: toIso(row.plannedEndUtc) ?? new Date(0).toISOString(),
      tzUsed: row.tzUsed,
      tenantUserId: shift?.tenantUserId ?? null,
      resourceId: shift?.resourceId ?? null,
      planningKind: row.planningKind,
      deadlineUtc: toIso(row.deadlineUtc),
      notes: row.notes,
      isPlanned: !!row.isPlanned,
      isReady: !!row.isReady,
      isMilestone: !!row.isMilestone,
      priority: row.priority,
      taskStatusId: row.taskStatusId,
    };
  }

  private summarize(conflicts: ConstraintConflict[]): PlannerConflictSummary {
    return {
      hard: conflicts.filter((c) => c.severity === 'hard').length,
      soft: conflicts.filter((c) => c.severity === 'soft').length,
    };
  }
}
