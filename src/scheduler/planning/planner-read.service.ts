import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In, Repository } from 'typeorm';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import { ScheduleScenariosService } from '../scenarios/schedule-scenarios.service';
import { ScenarioPlanningService } from './scenario-planning.service';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { ConstraintConflictCode } from '../constraints/constraint.codes';
import { ConstraintConflict } from '../constraints/constraint.types';
import { SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED } from '../constants';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskDependencyEntity } from '../entities/task_dependency.entity';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import {
  PlannerAttention,
  PlannerReadQueryDto,
  PlannerScale,
  PlannerView,
} from '../dto/planner-read.dto';
import {
  PlannerBoardBarView,
  PlannerBoardLaneView,
  PlannerBoardProjectView,
  PlannerBoardView,
  PlannerConflictsView,
  PlannerKpisView,
} from '../interfaces/planner-read.interface';
import { busyMsWithinRange } from '../constraints/interval.utils';

type ResolvedRange = {
  rangeStart: Date;
  rangeEnd: Date;
  rangeStartIso: string;
  rangeEndIso: string;
};

/**
 * Planner read models (board / KPIs / conflicts) for FE and gateway.
 * Week 4: dual-lane board, KPIs, scenario-aware conflicts.
 */
@Injectable()
export class PlannerReadService {
  constructor(
    private readonly requirements: SchedulingRequirementsService,
    private readonly scenarios: ScheduleScenariosService,
    private readonly planning: ScenarioPlanningService,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly tenantUsers: TenantUsersService,
    private readonly events: EventEmitter2,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(TaskDependencyEntity)
    private readonly depRepo: Repository<TaskDependencyEntity>,
  ) {}

  async getBoard(
    userId: number,
    input: PlannerReadQueryDto,
  ): Promise<PlannerBoardView> {
    const ctx = await this.resolveContext(userId, input);
    const scale: PlannerScale = input.scale ?? 'week';
    const view: PlannerView = input.view ?? 'both';

    if (!ctx.scenarioId) {
      return {
        tenantId: input.tenantId,
        schedulingRequirementId: input.schedulingRequirementId,
        scheduleScenarioId: null,
        revision: null,
        scale,
        rangeStart: ctx.range.rangeStartIso,
        rangeEnd: ctx.range.rangeEndIso,
        view,
        projects: [],
        resourceLanes: [],
        bars: [],
        deps: [],
        conflictSummary: { hard: 0, soft: 0 },
      };
    }

    const { conflicts } = await this.assessScenarioConflicts(
      input.tenantId,
      ctx.scenarioId,
      ctx.plannedTasks,
    );
    const issuesByTask = this.groupIssueCodesByTask(conflicts);

    const scopedTasks = await this.loadScopedTasks(
      ctx.requirement,
      input.projectId ?? null,
    );
    const taskById = new Map(scopedTasks.map((t) => [t.taskId, t]));
    const plannedByTaskId = new Map(
      ctx.plannedTasks.map((p) => [p.taskId, p]),
    );

    const projects = await this.buildProjectsTree(
      scopedTasks,
      plannedByTaskId,
      issuesByTask,
      input.q,
      input.attention ?? 'all',
    );

    const { lanes, bars } = this.buildLanesAndBars(
      scopedTasks,
      plannedByTaskId,
      issuesByTask,
      ctx.range,
      input.q,
      input.attention ?? 'all',
    );

    const deps = await this.loadDeps(
      Array.from(taskById.keys()),
      input.attention ?? 'all',
      issuesByTask,
    );

    let hard = 0;
    let soft = 0;
    for (const c of conflicts) {
      if (c.severity === 'hard') hard += 1;
      else soft += 1;
    }

    return {
      tenantId: input.tenantId,
      schedulingRequirementId: input.schedulingRequirementId,
      scheduleScenarioId: ctx.scenarioId,
      revision: ctx.revision,
      scale,
      rangeStart: ctx.range.rangeStartIso,
      rangeEnd: ctx.range.rangeEndIso,
      view,
      projects,
      resourceLanes: lanes,
      bars,
      deps,
      conflictSummary: { hard, soft },
    };
  }

  async getKpis(
    userId: number,
    input: PlannerReadQueryDto,
  ): Promise<PlannerKpisView> {
    const ctx = await this.resolveContext(userId, input);

    if (!ctx.scenarioId) {
      return this.emptyKpis(input, ctx.range);
    }

    const scopedTaskIds = await this.requirements.resolveScopedTaskIds(
      ctx.requirement,
    );
    const plannedByTaskId = new Map(
      ctx.plannedTasks.map((p) => [p.taskId, p]),
    );

    const { conflicts } = await this.assessScenarioConflicts(
      input.tenantId,
      ctx.scenarioId,
      ctx.plannedTasks,
    );

    const conflictTaskIds = new Set<number>();
    let hardCount = 0;
    for (const c of conflicts) {
      if (c.severity === 'hard') hardCount += 1;
      const taskId = Number(c.details?.taskId);
      if (Number.isFinite(taskId) && taskId > 0) conflictTaskIds.add(taskId);
    }

    let toScheduleCount = 0;
    let startsInPeriodCount = 0;
    let shiftedCount = 0;
    const scopedTasksForKpis =
      input.projectId != null
        ? await this.loadScopedTasks(ctx.requirement, input.projectId)
        : null;
    const taskIdsForCounts = scopedTasksForKpis
      ? scopedTasksForKpis.map((t) => t.taskId)
      : scopedTaskIds;

    for (const taskId of taskIdsForCounts) {
      const planned = plannedByTaskId.get(taskId);
      const hasAssignee = this.hasAssignee(planned);
      if (!planned || !planned.isPlanned || !hasAssignee) {
        toScheduleCount += 1;
      }
      if (planned?.plannedStartUtc) {
        const start = planned.plannedStartUtc.getTime();
        if (
          start >= ctx.range.rangeStart.getTime() &&
          start < ctx.range.rangeEnd.getTime()
        ) {
          startsInPeriodCount += 1;
        }
      }
      if (
        planned?.baselineStartUtc &&
        planned.plannedStartUtc &&
        planned.baselineStartUtc.getTime() !== planned.plannedStartUtc.getTime()
      ) {
        shiftedCount += 1;
      }
    }

    const deps = await this.depRepo.find({
      where: [
        { taskId: In(scopedTaskIds.length ? scopedTaskIds : [0]) },
        { dependsOnTaskId: In(scopedTaskIds.length ? scopedTaskIds : [0]) },
      ],
    });
    const criticalTaskIds = new Set<number>();
    for (const d of deps) {
      if (scopedTaskIds.includes(d.taskId)) criticalTaskIds.add(d.taskId);
      if (scopedTaskIds.includes(d.dependsOnTaskId)) {
        criticalTaskIds.add(d.dependsOnTaskId);
      }
    }

    const capacity = this.computeCapacityPressure(
      ctx.plannedTasks,
      ctx.range,
    );

    const needsAttentionCount = conflictTaskIds.size;
    const criticalPathCount = criticalTaskIds.size;
    const criticalPathRiskCount = [...criticalTaskIds].filter((id) =>
      conflictTaskIds.has(id),
    ).length;
    const replanningRequiredCount = [...conflictTaskIds].filter((id) => {
      const planned = plannedByTaskId.get(id);
      return (
        !!planned?.baselineStartUtc &&
        !!planned.plannedStartUtc &&
        planned.baselineStartUtc.getTime() !==
          planned.plannedStartUtc.getTime()
      );
    }).length;

    return {
      tenantId: input.tenantId,
      schedulingRequirementId: input.schedulingRequirementId,
      scheduleScenarioId: ctx.scenarioId,
      rangeStart: ctx.range.rangeStartIso,
      rangeEnd: ctx.range.rangeEndIso,
      capacityPressure: capacity,
      toScheduleCount,
      needsAttentionCount,
      criticalPathCount,
      startsInPeriodCount,
      blockersCount: hardCount,
      conflictCount: conflicts.length,
      criticalPathRiskCount,
      replanningRequiredCount,
      shiftedCount,
    };
  }

  async getConflicts(
    userId: number,
    input: PlannerReadQueryDto,
  ): Promise<PlannerConflictsView> {
    const ctx = await this.resolveContext(userId, input);

    if (!ctx.scenarioId) {
      return {
        tenantId: input.tenantId,
        schedulingRequirementId: input.schedulingRequirementId,
        scheduleScenarioId: null,
        count: 0,
        conflicts: [],
      };
    }

    const { conflicts } = await this.assessScenarioConflicts(
      input.tenantId,
      ctx.scenarioId,
      ctx.plannedTasks,
    );

    this.events.emit(SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED, {
      tenantId: input.tenantId,
      requirementId: input.schedulingRequirementId,
      scheduleScenarioId: ctx.scenarioId,
      count: conflicts.length,
    });

    return {
      tenantId: input.tenantId,
      schedulingRequirementId: input.schedulingRequirementId,
      scheduleScenarioId: ctx.scenarioId,
      count: conflicts.length,
      conflicts,
    };
  }

  private async resolveContext(
    userId: number,
    input: PlannerReadQueryDto,
  ): Promise<{
    requirement: Awaited<
      ReturnType<SchedulingRequirementsService['findOneOrFail']>
    >;
    scenarioId: number | null;
    revision: number | null;
    plannedTasks: ScenarioPlannedTaskEntity[];
    range: ResolvedRange;
  }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const requirement = await this.requirements.findOneOrFail(
      input.schedulingRequirementId,
      input.tenantId,
    );

    const scenarioId =
      input.scheduleScenarioId ??
      requirement.activeScenarioId ??
      requirement.definitiveScenarioId ??
      null;

    let revision: number | null = null;
    let plannedTasks: ScenarioPlannedTaskEntity[] = [];
    if (scenarioId) {
      const scenario = await this.scenarios.findOne(
        userId,
        scenarioId,
        input.tenantId,
      );
      revision = scenario.revision;
      plannedTasks = await this.planning.findPlannedTasks(userId, {
        tenantId: input.tenantId,
        scheduleScenarioId: scenarioId,
      });
    }

    const range = this.resolveRange(input, requirement);
    return { requirement, scenarioId, revision, plannedTasks, range };
  }

  private resolveRange(
    input: PlannerReadQueryDto,
    requirement: { horizonStartUtc: Date; horizonEndUtc: Date },
  ): ResolvedRange {
    const rangeStart = input.rangeStart
      ? new Date(`${input.rangeStart}T00:00:00.000Z`)
      : new Date(requirement.horizonStartUtc);
    const rangeEnd = input.rangeEnd
      ? new Date(`${input.rangeEnd}T23:59:59.999Z`)
      : new Date(requirement.horizonEndUtc);
    return {
      rangeStart,
      rangeEnd,
      rangeStartIso: rangeStart.toISOString().slice(0, 10),
      rangeEndIso: rangeEnd.toISOString().slice(0, 10),
    };
  }

  private async assessScenarioConflicts(
    tenantId: number,
    scenarioId: number,
    plannedTasks: ScenarioPlannedTaskEntity[],
  ): Promise<{ conflicts: ConstraintConflict[] }> {
    const placements: Array<{
      key: string;
      taskId: number;
      tenantUserId?: number | null;
      resourceId?: number | null;
      startUtc: Date;
      endUtc: Date;
    }> = [];
    const conflicts: ConstraintConflict[] = [];

    for (const pt of plannedTasks) {
      const hasAssignee = this.hasAssignee(pt);
      if (!hasAssignee && pt.isPlanned) {
        conflicts.push({
          code: ConstraintConflictCode.UNASSIGNED,
          severity: 'soft',
          message: 'Planned task has no assignee',
          details: { taskId: pt.taskId, placementKey: `task:${pt.taskId}` },
        });
      }

      for (const shift of pt.shifts ?? []) {
        placements.push({
          key: `shift:${pt.taskId}:${shift.sequenceNo}`,
          taskId: pt.taskId,
          tenantUserId: shift.tenantUserId,
          resourceId: shift.resourceId,
          startUtc: shift.plannedStartUtc,
          endUtc: shift.plannedEndUtc,
        });
      }
      for (const assignment of pt.assignments ?? []) {
        placements.push({
          key: `assignment:${pt.taskId}:${assignment.resourceId}:${assignment.assignedStart.getTime()}`,
          taskId: pt.taskId,
          resourceId: assignment.resourceId,
          startUtc: assignment.assignedStart,
          endUtc: assignment.assignedEnd,
        });
      }
    }

    if (placements.length) {
      const engineConflicts = await this.constraints.findConflicts({
        tenantId,
        placements,
        useScenarioBusy: true,
      });
      conflicts.push(...engineConflicts);
    }

    // Capacity exceeded per user from scenario busy
    const byUser = new Map<number, Array<{ startUtc: Date; endUtc: Date }>>();
    for (const p of placements) {
      if (!p.tenantUserId) continue;
      const list = byUser.get(p.tenantUserId) ?? [];
      list.push({ startUtc: p.startUtc, endUtc: p.endUtc });
      byUser.set(p.tenantUserId, list);
    }
    for (const [tenantUserId, intervals] of byUser) {
      const rangeStart = intervals.reduce(
        (min, i) => (i.startUtc < min ? i.startUtc : min),
        intervals[0].startUtc,
      );
      const rangeEnd = intervals.reduce(
        (max, i) => (i.endUtc > max ? i.endUtc : max),
        intervals[0].endUtc,
      );
      const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
      if (rangeMs <= 0) continue;
      const busyMs = busyMsWithinRange(intervals, rangeStart, rangeEnd);
      if (busyMs > rangeMs) {
        conflicts.push({
          code: ConstraintConflictCode.CAPACITY_EXCEEDED,
          severity: 'soft',
          message: 'Assignee capacity exceeded in scenario window',
          details: {
            tenantUserId,
            busyMs,
            rangeMs,
            scheduleScenarioId: scenarioId,
          },
        });
      }
    }

    return { conflicts };
  }

  private groupIssueCodesByTask(
    conflicts: ConstraintConflict[],
  ): Map<number, string[]> {
    const map = new Map<number, string[]>();
    for (const c of conflicts) {
      const taskId = Number(c.details?.taskId);
      if (!Number.isFinite(taskId) || taskId <= 0) continue;
      const list = map.get(taskId) ?? [];
      if (!list.includes(c.code)) list.push(c.code);
      map.set(taskId, list);
    }
    return map;
  }

  private async loadScopedTasks(
    requirement: Awaited<
      ReturnType<SchedulingRequirementsService['findOneOrFail']>
    >,
    projectId: number | null,
  ): Promise<TaskEntity[]> {
    let ids = await this.requirements.resolveScopedTaskIds(requirement);
    if (!ids.length) return [];
    const tasks = await this.taskRepo.find({
      where: { tenantId: requirement.tenantId, taskId: In(ids) },
    });
    if (projectId == null) return tasks;
    return tasks.filter((t) => t.projectId === projectId);
  }

  private async buildProjectsTree(
    scopedTasks: TaskEntity[],
    plannedByTaskId: Map<number, ScenarioPlannedTaskEntity>,
    issuesByTask: Map<number, string[]>,
    q: string | undefined,
    attention: PlannerAttention,
  ): Promise<PlannerBoardProjectView[]> {
    const projectIds = Array.from(
      new Set(scopedTasks.map((t) => t.projectId)),
    );
    const projects =
      projectIds.length > 0
        ? await this.projectRepo.find({
            where: { projectId: In(projectIds) },
          })
        : [];
    const nameByProject = new Map(projects.map((p) => [p.projectId, p.name]));

    const byProject = new Map<number, TaskEntity[]>();
    for (const task of scopedTasks) {
      if (!this.matchesSearch(task.name, q)) continue;
      const issues = issuesByTask.get(task.taskId) ?? [];
      if (!this.matchesAttention(issues, attention)) continue;
      const list = byProject.get(task.projectId) ?? [];
      list.push(task);
      byProject.set(task.projectId, list);
    }

    const out: PlannerBoardProjectView[] = [];
    for (const [projectId, tasks] of byProject) {
      out.push({
        projectId,
        name: nameByProject.get(projectId) ?? `Project ${projectId}`,
        children: tasks.map((t) => {
          const planned = plannedByTaskId.get(t.taskId);
          return {
            taskId: t.taskId,
            name: t.name,
            isMilestone: !!planned?.isMilestone,
            isPlanned: planned ? !!planned.isPlanned : false,
            issues: issuesByTask.get(t.taskId) ?? [],
          };
        }),
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildLanesAndBars(
    scopedTasks: TaskEntity[],
    plannedByTaskId: Map<number, ScenarioPlannedTaskEntity>,
    issuesByTask: Map<number, string[]>,
    range: ResolvedRange,
    q: string | undefined,
    attention: PlannerAttention,
  ): { lanes: PlannerBoardLaneView[]; bars: PlannerBoardBarView[] } {
    const laneMap = new Map<string, PlannerBoardLaneView>();
    const busyByLane = new Map<string, Array<{ startUtc: Date; endUtc: Date }>>();
    const bars: PlannerBoardBarView[] = [];
    const taskName = new Map(scopedTasks.map((t) => [t.taskId, t.name]));
    const taskProject = new Map(scopedTasks.map((t) => [t.taskId, t.projectId]));

    const ensureLane = (
      laneKey: string,
      subjectType: PlannerBoardLaneView['subjectType'],
      subjectId: number | null,
      label: string,
    ) => {
      if (!laneMap.has(laneKey)) {
        laneMap.set(laneKey, {
          laneKey,
          subjectType,
          subjectId,
          label,
          utilizationRatio: 0,
          overloaded: false,
        });
      }
    };

    for (const task of scopedTasks) {
      const planned = plannedByTaskId.get(task.taskId);
      const issues = issuesByTask.get(task.taskId) ?? [];
      if (q && !this.matchesSearch(task.name, q)) continue;
      if (!this.matchesAttention(issues, attention)) continue;

      const laneKeys: string[] = [`project:${task.projectId}`];
      ensureLane(
        `project:${task.projectId}`,
        'unassigned',
        task.projectId,
        `Project ${task.projectId}`,
      );

      if (!planned || !this.hasAssignee(planned)) {
        ensureLane('user:unassigned', 'unassigned', null, 'Unassigned');
        laneKeys.push('user:unassigned');
      }

      for (const shift of planned?.shifts ?? []) {
        if (shift.tenantUserId) {
          const key = `user:${shift.tenantUserId}`;
          ensureLane(key, 'user', shift.tenantUserId, `User ${shift.tenantUserId}`);
          laneKeys.push(key);
          const list = busyByLane.get(key) ?? [];
          list.push({
            startUtc: shift.plannedStartUtc,
            endUtc: shift.plannedEndUtc,
          });
          busyByLane.set(key, list);
        }
        if (shift.resourceId) {
          const key = `equipment:${shift.resourceId}`;
          ensureLane(
            key,
            'equipment',
            shift.resourceId,
            `Resource ${shift.resourceId}`,
          );
          laneKeys.push(key);
        }
      }

      bars.push({
        barId: `task:${task.taskId}`,
        taskId: task.taskId,
        projectId: taskProject.get(task.taskId) ?? null,
        label: taskName.get(task.taskId) ?? `Task ${task.taskId}`,
        laneKeys: Array.from(new Set(laneKeys)),
        startUtc: planned?.plannedStartUtc
          ? planned.plannedStartUtc.toISOString()
          : null,
        endUtc: planned?.plannedEndUtc
          ? planned.plannedEndUtc.toISOString()
          : null,
        isPlanned: planned ? !!planned.isPlanned : false,
        isMilestone: !!planned?.isMilestone,
        issues,
        attention: this.attentionFromIssues(issues),
      });
    }

    const rangeMs =
      range.rangeEnd.getTime() - range.rangeStart.getTime() || 1;
    for (const [laneKey, intervals] of busyByLane) {
      const lane = laneMap.get(laneKey);
      if (!lane) continue;
      const busyMs = busyMsWithinRange(
        intervals,
        range.rangeStart,
        range.rangeEnd,
      );
      lane.utilizationRatio = Math.round((busyMs / rangeMs) * 1000) / 1000;
      lane.overloaded = lane.utilizationRatio > 1;
    }

    return {
      lanes: Array.from(laneMap.values()).sort((a, b) =>
        a.laneKey.localeCompare(b.laneKey),
      ),
      bars,
    };
  }

  private async loadDeps(
    taskIds: number[],
    attention: PlannerAttention,
    issuesByTask: Map<number, string[]>,
  ): Promise<
    Array<{ fromTaskId: number; toTaskId: number; dependencyType: string }>
  > {
    if (!taskIds.length) return [];
    const deps = await this.depRepo.find({
      where: [
        { taskId: In(taskIds) },
        { dependsOnTaskId: In(taskIds) },
      ],
    });
    const idSet = new Set(taskIds);
    return deps
      .filter(
        (d) => idSet.has(d.taskId) && idSet.has(d.dependsOnTaskId),
      )
      .filter((d) => {
        if (attention === 'all') return true;
        const issues = [
          ...(issuesByTask.get(d.taskId) ?? []),
          ...(issuesByTask.get(d.dependsOnTaskId) ?? []),
        ];
        return this.matchesAttention(issues, attention);
      })
      .map((d) => ({
        fromTaskId: d.dependsOnTaskId,
        toTaskId: d.taskId,
        dependencyType: d.dependencyType,
      }));
  }

  private computeCapacityPressure(
    plannedTasks: ScenarioPlannedTaskEntity[],
    range: ResolvedRange,
  ): {
    periodUtil: number;
    peakUtil: number;
    overloadedResourceCount: number;
  } {
    const byUser = new Map<number, Array<{ startUtc: Date; endUtc: Date }>>();
    for (const pt of plannedTasks) {
      for (const shift of pt.shifts ?? []) {
        if (!shift.tenantUserId) continue;
        const list = byUser.get(shift.tenantUserId) ?? [];
        list.push({
          startUtc: shift.plannedStartUtc,
          endUtc: shift.plannedEndUtc,
        });
        byUser.set(shift.tenantUserId, list);
      }
    }
    const rangeMs =
      range.rangeEnd.getTime() - range.rangeStart.getTime() || 1;
    let totalBusy = 0;
    let peakUtil = 0;
    let overloadedResourceCount = 0;
    for (const intervals of byUser.values()) {
      const busyMs = busyMsWithinRange(
        intervals,
        range.rangeStart,
        range.rangeEnd,
      );
      const util = busyMs / rangeMs;
      totalBusy += busyMs;
      if (util > peakUtil) peakUtil = util;
      if (util > 1) overloadedResourceCount += 1;
    }
    const periodUtil =
      byUser.size > 0
        ? Math.round((totalBusy / (rangeMs * byUser.size)) * 100)
        : 0;
    return {
      periodUtil,
      peakUtil: Math.round(peakUtil * 100),
      overloadedResourceCount,
    };
  }

  private hasAssignee(planned?: ScenarioPlannedTaskEntity | null): boolean {
    if (!planned) return false;
    const shiftAssigned = (planned.shifts ?? []).some(
      (s) => s.tenantUserId != null || s.resourceId != null,
    );
    const assignmentAssigned = (planned.assignments ?? []).length > 0;
    return shiftAssigned || assignmentAssigned;
  }

  private matchesSearch(name: string, q?: string): boolean {
    if (!q || !q.trim()) return true;
    return name.toLowerCase().includes(q.trim().toLowerCase());
  }

  private matchesAttention(
    issues: string[],
    attention: PlannerAttention,
  ): boolean {
    if (attention === 'all') return true;
    if (attention === 'blocked') {
      return issues.some(
        (c) =>
          c === ConstraintConflictCode.USER_OVERLAP ||
          c === ConstraintConflictCode.EQUIPMENT_OVERLAP ||
          c === ConstraintConflictCode.CAPACITY_EXCEEDED ||
          c === ConstraintConflictCode.UNASSIGNED ||
          c === ConstraintConflictCode.RESOURCE_UNAVAILABLE ||
          c === ConstraintConflictCode.RESOURCE_BLACKOUT,
      );
    }
    // critical: dependency / deadline-ish codes
    return issues.some(
      (c) =>
        c === ConstraintConflictCode.DEPENDENCY_GATE ||
        c === ConstraintConflictCode.TASK_CONSTRAINT ||
        c === ConstraintConflictCode.OUTSIDE_HORIZON,
    );
  }

  private attentionFromIssues(
    issues: string[],
  ): PlannerAttention | 'ok' {
    if (this.matchesAttention(issues, 'blocked')) return 'blocked';
    if (this.matchesAttention(issues, 'critical')) return 'critical';
    return 'ok';
  }

  private emptyKpis(
    input: PlannerReadQueryDto,
    range: ResolvedRange,
  ): PlannerKpisView {
    return {
      tenantId: input.tenantId,
      schedulingRequirementId: input.schedulingRequirementId,
      scheduleScenarioId: null,
      rangeStart: range.rangeStartIso,
      rangeEnd: range.rangeEndIso,
      capacityPressure: {
        periodUtil: 0,
        peakUtil: 0,
        overloadedResourceCount: 0,
      },
      toScheduleCount: 0,
      needsAttentionCount: 0,
      criticalPathCount: 0,
      startsInPeriodCount: 0,
      blockersCount: 0,
      conflictCount: 0,
      criticalPathRiskCount: 0,
      replanningRequiredCount: 0,
      shiftedCount: 0,
    };
  }
}
