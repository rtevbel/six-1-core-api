import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import { ScenarioPlannedShiftEntity } from '../entities/scenario_planned_shift.entity';
import { ScenarioResourceAssignmentEntity } from '../entities/scenario_resource_assignment.entity';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import {
  ScenarioAuditService,
  assertRequirementOpen,
  assertScenarioEditable,
} from '../scenarios/scenario-audit.service';
import { assertExpectedRevision } from '../scenarios/scenario-lifecycle.mapper';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { ConstraintConflict } from '../constraints/constraint.types';
import {
  PlannerPlanningPhase,
  SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED,
  ScenarioPlanningKind,
} from '../constants';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { PlannerSheetExtras } from '../interfaces/planner-sheet-extras.interface';
import {
  normalizeSheetExtras,
  sheetExtrasFromEntity,
} from './planner-sheet-extras.util';

@Injectable()
export class ScenarioPlanningService {
  private readonly logger = new Logger(ScenarioPlanningService.name);

  constructor(
    @InjectRepository(ScheduleScenarioEntity)
    private readonly scenarioRepo: Repository<ScheduleScenarioEntity>,
    @InjectRepository(ScenarioPlannedTaskEntity)
    private readonly plannedTaskRepo: Repository<ScenarioPlannedTaskEntity>,
    @InjectRepository(ScenarioPlannedShiftEntity)
    private readonly shiftRepo: Repository<ScenarioPlannedShiftEntity>,
    @InjectRepository(ScenarioResourceAssignmentEntity)
    private readonly assignmentRepo: Repository<ScenarioResourceAssignmentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    private readonly requirements: SchedulingRequirementsService,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly audit: ScenarioAuditService,
    private readonly tenantUsers: TenantUsersService,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  async upsertPlannedTask(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      taskId: number;
      plannedStartUtc: Date;
      plannedEndUtc: Date;
      tzUsed?: string;
      priority?: number;
      taskStatusId?: number | null;
      notes?: string | null;
      planningKind?: ScenarioPlanningKind;
      deadlineUtc?: Date | null;
      isPlanned?: boolean;
      isReady?: boolean;
      readyPct?: number;
      isMilestone?: boolean;
      planningPhase?: PlannerPlanningPhase;
      taskName?: string;
      expectedRevision?: number;
      /** When set (including empty), replaces stored sheet extras. */
      sheetExtras?: PlannerSheetExtras | null;
      shifts?: Array<{
        sequenceNo: number;
        tenantUserId?: number | null;
        resourceId?: number | null;
        plannedStartUtc: Date;
        plannedEndUtc: Date;
      }>;
      assignments?: Array<{
        resourceId: number;
        assignedStart: Date;
        assignedEnd: Date;
        scenarioPlannedShiftId?: number | null;
      }>;
    },
  ): Promise<{
    plannedTask: ScenarioPlannedTaskEntity;
    conflicts: ConstraintConflict[];
    revision: number;
  }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const scoped = await this.requirements.resolveScopedTaskIds(requirement);
    if (!scoped.includes(input.taskId)) {
      throw new RpcException('Task is outside requirement membership scope');
    }

    const parentValidation = await this.constraints.validatePlacement({
      tenantId: input.tenantId,
      taskId: input.taskId,
      startUtc: input.plannedStartUtc,
      endUtc: input.plannedEndUtc,
      mode: 'parent_window',
      horizonStartUtc: requirement.horizonStartUtc,
      horizonEndUtc: requirement.horizonEndUtc,
    });

    const conflicts: ConstraintConflict[] = [
      ...parentValidation.hard,
      ...parentValidation.soft,
    ];

    for (const shift of input.shifts ?? []) {
      const shiftResult = await this.constraints.validatePlacement({
        tenantId: input.tenantId,
        taskId: input.taskId,
        tenantUserId: shift.tenantUserId,
        resourceId: shift.resourceId,
        startUtc: shift.plannedStartUtc,
        endUtc: shift.plannedEndUtc,
        mode: 'shift',
        horizonStartUtc: requirement.horizonStartUtc,
        horizonEndUtc: requirement.horizonEndUtc,
        useScenarioBusy: true,
      });
      conflicts.push(...shiftResult.hard, ...shiftResult.soft);
    }

    const plannedTask = await this.dataSource.transaction(async (manager) => {
      const ptRepo = manager.getRepository(ScenarioPlannedTaskEntity);
      const shRepo = manager.getRepository(ScenarioPlannedShiftEntity);
      const asRepo = manager.getRepository(ScenarioResourceAssignmentEntity);

      let row = await ptRepo.findOne({
        where: {
          scheduleScenarioId: input.scheduleScenarioId,
          taskId: input.taskId,
        },
      });
      if (!row) {
        row = ptRepo.create({
          scheduleScenarioId: input.scheduleScenarioId,
          taskId: input.taskId,
        });
      }
      row.plannedStartUtc = input.plannedStartUtc;
      row.plannedEndUtc = input.plannedEndUtc;
      row.tzUsed = input.tzUsed ?? 'UTC';
      row.priority = input.priority ?? 0;
      row.taskStatusId = input.taskStatusId ?? null;
      row.notes = input.notes ?? null;
      if (input.planningKind != null) {
        row.planningKind = input.planningKind;
      }
      if (input.deadlineUtc !== undefined) {
        row.deadlineUtc = input.deadlineUtc;
      }
      if (input.isPlanned != null) {
        row.isPlanned = input.isPlanned;
      }
      if (input.isReady != null) {
        row.isReady = input.isReady;
      }
      if (input.readyPct != null) {
        row.readyPct = Math.max(0, Math.min(100, Math.round(input.readyPct)));
        if (row.readyPct >= 100) {
          row.isReady = true;
        }
      }
      if (input.planningPhase != null) {
        row.planningPhase = input.planningPhase;
      }
      if (input.isMilestone != null) {
        row.isMilestone = input.isMilestone;
      } else if (input.planningKind === 'milestone') {
        row.isMilestone = true;
      }
      if (input.sheetExtras !== undefined) {
        row.sheetExtras =
          input.sheetExtras == null
            ? null
            : (normalizeSheetExtras(input.sheetExtras) as unknown as Record<
                string,
                unknown
              >);
      }
      row.conflictSummary = {
        hard: conflicts.filter((c) => c.severity === 'hard'),
        soft: conflicts.filter((c) => c.severity === 'soft'),
      };
      const saved = await ptRepo.save(row);

      await shRepo.delete({ scenarioPlannedTaskId: saved.scenarioPlannedTaskId });
      await asRepo.delete({
        scenarioPlannedTaskId: saved.scenarioPlannedTaskId,
      });

      if (input.shifts?.length) {
        const shifts = input.shifts.map((s) =>
          shRepo.create({
            scenarioPlannedTaskId: saved.scenarioPlannedTaskId,
            sequenceNo: s.sequenceNo,
            tenantUserId: s.tenantUserId ?? null,
            resourceId: s.resourceId ?? null,
            plannedStartUtc: s.plannedStartUtc,
            plannedEndUtc: s.plannedEndUtc,
          }),
        );
        await shRepo.save(shifts);
        saved.shifts = shifts;
      } else {
        saved.shifts = [];
      }

      if (input.assignments?.length) {
        const assignments = input.assignments.map((a) =>
          asRepo.create({
            scenarioPlannedTaskId: saved.scenarioPlannedTaskId,
            resourceId: a.resourceId,
            assignedStart: a.assignedStart,
            assignedEnd: a.assignedEnd,
            scenarioPlannedShiftId: a.scenarioPlannedShiftId ?? null,
          }),
        );
        await asRepo.save(assignments);
        saved.assignments = assignments;
      } else {
        saved.assignments = [];
      }

      if (input.taskName?.trim()) {
        const task = await manager.getRepository(TaskEntity).findOne({
          where: { taskId: input.taskId, tenantId: input.tenantId },
        });
        if (task) {
          task.name = input.taskName.trim();
          await manager.getRepository(TaskEntity).save(task);
        }
      }

      scenario.revision += 1;
      await manager.getRepository(ScheduleScenarioEntity).save(scenario);
      return saved;
    });

    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'item_moved',
      payload: { taskId: input.taskId, conflictCount: conflicts.length },
    });

    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: input.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'task_upsert',
    });

    return {
      plannedTask,
      conflicts,
      revision: scenario.revision,
    };
  }

  async removePlannedTask(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      taskId: number;
      expectedRevision?: number;
    },
  ): Promise<{ removed: boolean; revision: number }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const row = await this.plannedTaskRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        taskId: input.taskId,
      },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScenarioPlannedTaskEntity.name,
        ),
      );
    }
    await this.plannedTaskRepo.remove(row);
    scenario.revision += 1;
    await this.scenarioRepo.save(scenario);
    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'updated',
      payload: { removedTaskId: input.taskId },
    });
    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: input.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'task_remove',
    });
    return { removed: true, revision: scenario.revision };
  }

  async findPlannedTasks(
    userId: number,
    input: { tenantId: number; scheduleScenarioId: number },
  ): Promise<ScenarioPlannedTaskEntity[]> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    await this.loadScenario(input.scheduleScenarioId, input.tenantId);
    return this.plannedTaskRepo.find({
      where: { scheduleScenarioId: input.scheduleScenarioId },
      relations: ['shifts', 'assignments'],
      order: { plannedStartUtc: 'ASC' },
    });
  }

  /**
   * Split one planned bar into two sibling tasks (Week 11).
   */
  async splitPlannedTask(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      taskId: number;
      splitAtUtc: Date;
      expectedRevision?: number;
    },
  ): Promise<{
    revision: number;
    original: ScenarioPlannedTaskEntity;
    created: ScenarioPlannedTaskEntity;
    createdTaskId: number;
  }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const scoped = await this.requirements.resolveScopedTaskIds(requirement);
    if (!scoped.includes(input.taskId)) {
      throw new RpcException({
        statusCode: 400,
        message: 'Task is outside requirement membership scope',
      });
    }

    const source = await this.plannedTaskRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        taskId: input.taskId,
      },
      relations: ['shifts', 'assignments'],
    });
    if (!source) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScenarioPlannedTaskEntity.name,
        ),
      );
    }
    if (source.isMilestone) {
      throw new RpcException({
        statusCode: 400,
        message: 'Cannot split a milestone',
      });
    }
    const splitAt = input.splitAtUtc.getTime();
    if (
      !(
        source.plannedStartUtc.getTime() < splitAt &&
        splitAt < source.plannedEndUtc.getTime()
      )
    ) {
      throw new RpcException({
        statusCode: 400,
        message: 'splitAtUtc must be strictly inside the planned window',
      });
    }

    const master = await this.taskRepo.findOne({
      where: { taskId: input.taskId, tenantId: input.tenantId },
    });
    if (!master) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(TaskEntity);
      const ptRepo = manager.getRepository(ScenarioPlannedTaskEntity);
      const shRepo = manager.getRepository(ScenarioPlannedShiftEntity);
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);

      const siblingName = `${master.name} (split)`;
      const sibling = await taskRepo.save(
        taskRepo.create({
          tenantId: input.tenantId,
          projectId: master.projectId,
          taskIdentifier: `task-split-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          name: siblingName,
          description: master.description,
          taskStatusId: master.taskStatusId,
          priority: master.priority,
          statusControl: master.statusControl ?? 'manual',
          schedulingMode: master.schedulingMode ?? 'manual',
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      const originalEnd = source.plannedEndUtc;
      source.plannedEndUtc = input.splitAtUtc;
      for (const shift of source.shifts ?? []) {
        if (shift.plannedEndUtc.getTime() > splitAt) {
          shift.plannedEndUtc = input.splitAtUtc;
        }
        if (shift.plannedStartUtc.getTime() >= splitAt) {
          shift.plannedStartUtc = source.plannedStartUtc;
          shift.plannedEndUtc = input.splitAtUtc;
        }
      }
      await ptRepo.save(source);
      if (source.shifts?.length) {
        await shRepo.save(source.shifts);
      }

      const created = await ptRepo.save(
        ptRepo.create({
          scheduleScenarioId: input.scheduleScenarioId,
          taskId: sibling.taskId,
          plannedStartUtc: input.splitAtUtc,
          plannedEndUtc: originalEnd,
          tzUsed: source.tzUsed,
          priority: source.priority,
          taskStatusId: source.taskStatusId,
          notes: source.notes,
          isPlanned: source.isPlanned,
          isReady: false,
          readyPct: 0,
          isMilestone: false,
          planningKind: source.planningKind,
          planningPhase: source.planningPhase ?? 'plan',
          deadlineUtc: source.deadlineUtc,
          sheetExtras: normalizeSheetExtras({
            ...(sheetExtrasFromEntity(source.sheetExtras) ?? {}),
            predecessors: [
              {
                dependsOnTaskId: input.taskId,
                dependencyType: 'FS',
                lagDays: 0,
              },
            ],
          }) as unknown as Record<string, unknown>,
        }),
      );

      const firstShift = (source.shifts ?? [])[0];
      if (firstShift && (firstShift.tenantUserId || firstShift.resourceId)) {
        await shRepo.save(
          shRepo.create({
            scenarioPlannedTaskId: created.scenarioPlannedTaskId,
            sequenceNo: 1,
            tenantUserId: firstShift.tenantUserId,
            resourceId: firstShift.resourceId,
            plannedStartUtc: input.splitAtUtc,
            plannedEndUtc: originalEnd,
          }),
        );
      }

      scenario.revision += 1;
      await scenarioRepo.save(scenario);

      const reloadedCreated = await ptRepo.findOne({
        where: { scenarioPlannedTaskId: created.scenarioPlannedTaskId },
        relations: ['shifts', 'assignments'],
      });
      const reloadedOriginal = await ptRepo.findOne({
        where: { scenarioPlannedTaskId: source.scenarioPlannedTaskId },
        relations: ['shifts', 'assignments'],
      });
      return {
        original: reloadedOriginal!,
        created: reloadedCreated!,
        createdTaskId: sibling.taskId,
      };
    });

    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'item_moved',
      payload: {
        splitTaskId: input.taskId,
        createdTaskId: result.createdTaskId,
      },
    });
    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: input.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'task_split',
    });

    return {
      revision: scenario.revision,
      original: result.original,
      created: result.created,
      createdTaskId: result.createdTaskId,
    };
  }

  /**
   * Merge two planned overlays into keepTaskId (Week 11).
   */
  async mergePlannedTasks(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      keepTaskId: number;
      absorbTaskId: number;
      expectedRevision?: number;
    },
  ): Promise<{
    revision: number;
    keep: ScenarioPlannedTaskEntity;
  }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    if (input.keepTaskId === input.absorbTaskId) {
      throw new RpcException({
        statusCode: 400,
        message: 'keepTaskId and absorbTaskId must differ',
      });
    }
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const [keepMaster, absorbMaster] = await Promise.all([
      this.taskRepo.findOne({
        where: { taskId: input.keepTaskId, tenantId: input.tenantId },
      }),
      this.taskRepo.findOne({
        where: { taskId: input.absorbTaskId, tenantId: input.tenantId },
      }),
    ]);
    if (!keepMaster || !absorbMaster) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }
    if (keepMaster.projectId !== absorbMaster.projectId) {
      throw new RpcException({
        statusCode: 400,
        message: 'Merge requires both tasks in the same project',
      });
    }

    const keep = await this.plannedTaskRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        taskId: input.keepTaskId,
      },
      relations: ['shifts', 'assignments'],
    });
    const absorb = await this.plannedTaskRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        taskId: input.absorbTaskId,
      },
      relations: ['shifts', 'assignments'],
    });
    if (!keep || !absorb) {
      throw new RpcException({
        statusCode: 400,
        message: 'Both tasks must be planned in the scenario to merge',
      });
    }

    const merged = await this.dataSource.transaction(async (manager) => {
      const ptRepo = manager.getRepository(ScenarioPlannedTaskEntity);
      const shRepo = manager.getRepository(ScenarioPlannedShiftEntity);
      const asRepo = manager.getRepository(ScenarioResourceAssignmentEntity);
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);

      const start =
        keep.plannedStartUtc.getTime() <= absorb.plannedStartUtc.getTime()
          ? keep.plannedStartUtc
          : absorb.plannedStartUtc;
      const end =
        keep.plannedEndUtc.getTime() >= absorb.plannedEndUtc.getTime()
          ? keep.plannedEndUtc
          : absorb.plannedEndUtc;
      keep.plannedStartUtc = start;
      keep.plannedEndUtc = end;

      const keepExtras = sheetExtrasFromEntity(keep.sheetExtras) ?? {
        requiredSkills: [],
        partnerRecordKeys: [],
        requiredMaterials: [],
        requiredEquipmentRecordKeys: [],
        assignedEquipmentRecordKeys: [],
        predecessors: [],
      };
      const absorbExtras = sheetExtrasFromEntity(absorb.sheetExtras);
      const predMap = new Map<
        number,
        { dependsOnTaskId: number; dependencyType: string; lagDays: number }
      >();
      for (const p of [
        ...(keepExtras.predecessors ?? []),
        ...(absorbExtras?.predecessors ?? []),
      ]) {
        if (
          p.dependsOnTaskId === input.keepTaskId ||
          p.dependsOnTaskId === input.absorbTaskId
        ) {
          continue;
        }
        predMap.set(p.dependsOnTaskId, p);
      }
      keep.sheetExtras = normalizeSheetExtras({
        ...keepExtras,
        predecessors: Array.from(predMap.values()),
      }) as unknown as Record<string, unknown>;

      await ptRepo.save(keep);
      if (keep.shifts?.[0]) {
        keep.shifts[0].plannedStartUtc = start;
        keep.shifts[0].plannedEndUtc = end;
        await shRepo.save(keep.shifts[0]);
      }

      await asRepo.delete({
        scenarioPlannedTaskId: absorb.scenarioPlannedTaskId,
      });
      await shRepo.delete({
        scenarioPlannedTaskId: absorb.scenarioPlannedTaskId,
      });
      await ptRepo.remove(absorb);

      // Drop predecessors pointing at absorb on other planned tasks
      const others = await ptRepo.find({
        where: { scheduleScenarioId: input.scheduleScenarioId },
      });
      for (const row of others) {
        if (row.taskId === input.keepTaskId) continue;
        const extras = sheetExtrasFromEntity(row.sheetExtras);
        if (!extras?.predecessors?.length) continue;
        const filtered = extras.predecessors.filter(
          (p) => p.dependsOnTaskId !== input.absorbTaskId,
        );
        if (filtered.length !== extras.predecessors.length) {
          row.sheetExtras = normalizeSheetExtras({
            ...extras,
            predecessors: filtered,
          }) as unknown as Record<string, unknown>;
          await ptRepo.save(row);
        }
      }

      scenario.revision += 1;
      await scenarioRepo.save(scenario);
      return ptRepo.findOne({
        where: { scenarioPlannedTaskId: keep.scenarioPlannedTaskId },
        relations: ['shifts', 'assignments'],
      });
    });

    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'item_moved',
      payload: {
        keepTaskId: input.keepTaskId,
        absorbTaskId: input.absorbTaskId,
      },
    });
    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: input.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'task_merge',
    });

    return { revision: scenario.revision, keep: merged! };
  }

  /**
   * Set/replace an overlay predecessor on the to-task (Week 11 selection dep).
   */
  async setOverlayDependency(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      fromTaskId: number;
      toTaskId: number;
      dependencyType: 'FS' | 'SS' | 'FF' | 'SF';
      lagDays?: number;
      expectedRevision?: number;
    },
  ): Promise<{ revision: number }> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    if (input.fromTaskId === input.toTaskId) {
      throw new RpcException({
        statusCode: 400,
        message: 'fromTaskId and toTaskId must differ',
      });
    }
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);
    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);
    const scoped = await this.requirements.resolveScopedTaskIds(requirement);
    if (
      !scoped.includes(input.fromTaskId) ||
      !scoped.includes(input.toTaskId)
    ) {
      throw new RpcException({
        statusCode: 400,
        message: 'Both tasks must be in requirement scope',
      });
    }

    let toRow = await this.plannedTaskRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        taskId: input.toTaskId,
      },
    });
    if (!toRow) {
      throw new RpcException({
        statusCode: 400,
        message: 'Successor task must be planned in the scenario',
      });
    }

    const extras = sheetExtrasFromEntity(toRow.sheetExtras) ?? {
      requiredSkills: [],
      partnerRecordKeys: [],
      requiredMaterials: [],
      requiredEquipmentRecordKeys: [],
      assignedEquipmentRecordKeys: [],
      predecessors: [],
    };
    const predecessors = (extras.predecessors ?? []).filter(
      (p) => p.dependsOnTaskId !== input.fromTaskId,
    );
    predecessors.push({
      dependsOnTaskId: input.fromTaskId,
      dependencyType: input.dependencyType,
      lagDays: input.lagDays ?? 0,
    });
    toRow.sheetExtras = normalizeSheetExtras({
      ...extras,
      predecessors,
    }) as unknown as Record<string, unknown>;
    await this.plannedTaskRepo.save(toRow);
    scenario.revision += 1;
    await this.scenarioRepo.save(scenario);

    await this.audit.appendEvent({
      schedulingRequirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'updated',
      payload: {
        fromTaskId: input.fromTaskId,
        toTaskId: input.toTaskId,
        dependencyType: input.dependencyType,
      },
    });
    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED, {
      tenantId: input.tenantId,
      requirementId: scenario.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      actorUserId: userId,
      cause: 'dependency_set',
    });
    return { revision: scenario.revision };
  }

  async loadScenarioGraph(scheduleScenarioId: number): Promise<{
    plannedTasks: ScenarioPlannedTaskEntity[];
  }> {
    const plannedTasks = await this.plannedTaskRepo.find({
      where: { scheduleScenarioId },
      relations: ['shifts', 'assignments'],
      order: { plannedStartUtc: 'ASC' },
    });
    return { plannedTasks };
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
