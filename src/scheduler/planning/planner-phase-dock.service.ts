import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import { ScenarioPlannedShiftEntity } from '../entities/scenario_planned_shift.entity';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import {
  ScenarioAuditService,
  assertRequirementOpen,
  assertScenarioEditable,
} from '../scenarios/scenario-audit.service';
import {
  assertExpectedRevision,
  toIso,
} from '../scenarios/scenario-lifecycle.mapper';
import {
  PLANNER_PHASE_LABELS,
  PLANNER_PLANNING_PHASES,
  PlannerPlanningPhase,
  SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED,
} from '../constants';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import {
  PlannerDockTemplateApplyDto,
  PlannerPhaseDockQueryDto,
  PlannerProcessRunAppendDto,
  PlannerProcessRunsListDto,
} from '../dto/planner-phase-dock.dto';
import {
  PlannerDockTemplateApplyView,
  PlannerPhaseDockView,
  PlannerProcessRunAppendView,
  PlannerProcessRunView,
  PlannerProcessRunsListView,
} from '../interfaces/planner-phase-dock.interface';
import {
  PLANNER_DOCK_TEMPLATES,
  findDockTemplate,
  normalizePlanningPhase,
} from './planner-dock-templates';

const PROCESS_RUNS_CAP = 100;

@Injectable()
export class PlannerPhaseDockService {
  constructor(
    private readonly tenantUsers: TenantUsersService,
    private readonly requirements: SchedulingRequirementsService,
    private readonly audit: ScenarioAuditService,
    private readonly events: EventEmitter2,
    @InjectRepository(ScheduleScenarioEntity)
    private readonly scenarioRepo: Repository<ScheduleScenarioEntity>,
    @InjectRepository(ScenarioPlannedTaskEntity)
    private readonly plannedTaskRepo: Repository<ScenarioPlannedTaskEntity>,
    @InjectRepository(ScenarioPlannedShiftEntity)
    private readonly shiftRepo: Repository<ScenarioPlannedShiftEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  async getPhaseDock(
    userId: number,
    dto: PlannerPhaseDockQueryDto,
  ): Promise<PlannerPhaseDockView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.loadScenario(
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      dto.tenantId,
    );
    const scopedIds = await this.requirements.resolveScopedTaskIds(requirement);
    const tasks =
      scopedIds.length > 0
        ? await this.taskRepo.find({
            where: { tenantId: dto.tenantId, taskId: In(scopedIds) },
          })
        : [];
    const filtered =
      dto.projectId != null
        ? tasks.filter((t) => t.projectId === dto.projectId)
        : tasks;
    const planned = await this.plannedTaskRepo.find({
      where: { scheduleScenarioId: dto.scheduleScenarioId },
    });
    const nameByTask = new Map(filtered.map((t) => [t.taskId, t.name]));
    const projectByTask = new Map(filtered.map((t) => [t.taskId, t.projectId]));
    const scopedSet = new Set(filtered.map((t) => t.taskId));

    const tasksByPhase = Object.fromEntries(
      PLANNER_PLANNING_PHASES.map((p) => [p, [] as PlannerPhaseDockView['tasksByPhase'][PlannerPlanningPhase]]),
    ) as PlannerPhaseDockView['tasksByPhase'];

    // Architecture §2.6: phase dock lists planned overlay tasks only — do not
    // inflate counts by dumping unplanned scoped masters into default `plan`.
    for (const row of planned) {
      if (!scopedSet.has(row.taskId)) continue;
      if (dto.projectId != null && projectByTask.get(row.taskId) !== dto.projectId) {
        continue;
      }
      const phase = normalizePlanningPhase(row.planningPhase);
      tasksByPhase[phase].push({
        taskId: row.taskId,
        name: nameByTask.get(row.taskId) ?? `Task ${row.taskId}`,
        projectId: projectByTask.get(row.taskId) ?? null,
        planningPhase: phase,
        plannedStartUtc: toIso(row.plannedStartUtc),
        plannedEndUtc: toIso(row.plannedEndUtc),
      });
    }

    return {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      revision: scenario.revision,
      phases: PLANNER_PLANNING_PHASES.map((id) => ({
        id,
        label: PLANNER_PHASE_LABELS[id],
        taskCount: tasksByPhase[id].length,
      })),
      templates: PLANNER_DOCK_TEMPLATES,
      tasksByPhase,
    };
  }

  async applyDockTemplate(
    userId: number,
    dto: PlannerDockTemplateApplyDto,
  ): Promise<PlannerDockTemplateApplyView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const template = findDockTemplate(dto.templateId);
    if (!template) {
      throw new RpcException({
        statusCode: 404,
        message: `Unknown dock template: ${dto.templateId}`,
      });
    }
    const scenario = await this.loadEditableScenario(
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    assertExpectedRevision(scenario, dto.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      dto.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const start = new Date(dto.plannedStartUtc);
    if (Number.isNaN(start.getTime())) {
      throw new RpcException({
        statusCode: 400,
        message: 'Invalid plannedStartUtc',
      });
    }
    const end = new Date(
      start.getTime() + template.defaultDurHours * 60 * 60 * 1000,
    );
    const phase = dto.planningPhase ?? template.phase;

    // Pick any existing task status in tenant/project context — clone from a sibling if present
    const sample = await this.taskRepo.findOne({
      where: { tenantId: dto.tenantId, projectId: dto.projectId },
      order: { taskId: 'ASC' },
    });
    const taskStatusId = sample?.taskStatusId ?? 1;

    const createdTask = await this.taskRepo.save(
      this.taskRepo.create({
        tenantId: dto.tenantId,
        projectId: dto.projectId,
        taskIdentifier: `task-tpl-${template.templateId}-${Date.now().toString(36)}`,
        name: template.title,
        taskStatusId,
        priority: 'medium',
        statusControl: 'manual',
        schedulingMode: 'manual',
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    const planned = await this.plannedTaskRepo.save(
      this.plannedTaskRepo.create({
        scheduleScenarioId: dto.scheduleScenarioId,
        taskId: createdTask.taskId,
        plannedStartUtc: start,
        plannedEndUtc: end,
        tzUsed: 'UTC',
        isPlanned: true,
        isReady: false,
        readyPct: 0,
        isMilestone: template.planningKind === 'milestone',
        planningKind: template.planningKind,
        planningPhase: phase,
      }),
    );

    if (dto.tenantUserId != null) {
      await this.shiftRepo.save(
        this.shiftRepo.create({
          scenarioPlannedTaskId: planned.scenarioPlannedTaskId,
          sequenceNo: 1,
          tenantUserId: dto.tenantUserId,
          resourceId: null,
          plannedStartUtc: start,
          plannedEndUtc: end,
        }),
      );
    }

    scenario.revision += 1;
    await this.scenarioRepo.save(scenario);

    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'item_moved',
      payload: {
        templateId: dto.templateId,
        taskId: createdTask.taskId,
      },
    });
    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: dto.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'task_upsert',
    });

    return {
      revision: scenario.revision,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: createdTask.taskId,
      plannedStartUtc: start.toISOString(),
      plannedEndUtc: end.toISOString(),
      planningPhase: phase,
      templateId: dto.templateId,
    };
  }

  async listProcessRuns(
    userId: number,
    dto: PlannerProcessRunsListDto,
  ): Promise<PlannerProcessRunsListView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.loadScenario(
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    let items = this.mapProcessRuns(scenario.processRuns);
    if (dto.taskId != null) {
      items = items.filter((run) => run.taskId === dto.taskId);
    }
    return {
      scheduleScenarioId: dto.scheduleScenarioId,
      revision: scenario.revision,
      items,
    };
  }

  async appendProcessRun(
    userId: number,
    dto: PlannerProcessRunAppendDto,
  ): Promise<PlannerProcessRunAppendView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.loadEditableScenario(
      dto.scheduleScenarioId,
      dto.tenantId,
    );
    assertExpectedRevision(scenario, dto.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      dto.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const run: PlannerProcessRunView = {
      id: randomUUID(),
      action: dto.action,
      label: dto.label,
      taskId: dto.taskId ?? null,
      projectId: dto.projectId ?? null,
      at: new Date().toISOString(),
      actorId: userId,
      status: dto.status ?? 'ok',
    };
    const existing = this.mapProcessRuns(scenario.processRuns);
    const next = [...existing, run].slice(-PROCESS_RUNS_CAP);
    scenario.processRuns = next as unknown as Array<Record<string, unknown>>;
    scenario.revision += 1;
    await this.scenarioRepo.save(scenario);

    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: dto.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'process_run',
    });

    return {
      revision: scenario.revision,
      scheduleScenarioId: dto.scheduleScenarioId,
      run,
    };
  }

  private mapProcessRuns(
    raw: Array<Record<string, unknown>> | null | undefined,
  ): PlannerProcessRunView[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const action = String(item.action ?? '');
        const status = item.status === 'warn' ? 'warn' : 'ok';
        return {
          id: String(item.id ?? ''),
          action: action as PlannerProcessRunView['action'],
          label: String(item.label ?? action),
          taskId:
            item.taskId == null || item.taskId === ''
              ? null
              : Number(item.taskId),
          projectId:
            item.projectId == null || item.projectId === ''
              ? null
              : Number(item.projectId),
          at: String(item.at ?? new Date(0).toISOString()),
          actorId:
            item.actorId == null || item.actorId === ''
              ? null
              : Number(item.actorId),
          status,
        } as PlannerProcessRunView;
      })
      .filter((x): x is PlannerProcessRunView => !!x && !!x.id);
  }

  private async loadEditableScenario(
    scheduleScenarioId: number,
    tenantId: number,
  ): Promise<ScheduleScenarioEntity> {
    const scenario = await this.loadScenario(scheduleScenarioId, tenantId);
    assertScenarioEditable(scenario.status);
    return scenario;
  }

  private async loadScenario(
    scheduleScenarioId: number,
    tenantId: number,
  ): Promise<ScheduleScenarioEntity> {
    const scenario = await this.scenarioRepo.findOne({
      where: { scheduleScenarioId, tenantId },
    });
    if (!scenario) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduleScenarioEntity.name,
        ),
      );
    }
    return scenario;
  }
}
