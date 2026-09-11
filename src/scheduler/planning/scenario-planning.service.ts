import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
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
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { ConstraintConflict } from '../constraints/constraint.types';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';

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
    private readonly requirements: SchedulingRequirementsService,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly audit: ScenarioAuditService,
    private readonly dataSource: DataSource,
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
  }> {
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
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

    return { plannedTask, conflicts };
  }

  async removePlannedTask(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      taskId: number;
    },
  ): Promise<{ removed: boolean }> {
    const scenario = await this.loadEditableScenario(
      input.scheduleScenarioId,
      input.tenantId,
    );
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
    return { removed: true };
  }

  async findPlannedTasks(
    userId: number,
    input: { tenantId: number; scheduleScenarioId: number },
  ): Promise<ScenarioPlannedTaskEntity[]> {
    await this.loadScenario(input.scheduleScenarioId, input.tenantId);
    return this.plannedTaskRepo.find({
      where: { scheduleScenarioId: input.scheduleScenarioId },
      relations: ['shifts', 'assignments'],
      order: { plannedStartUtc: 'ASC' },
    });
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
