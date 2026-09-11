import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { DataSource, In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { SchedulingRequirementEntity } from '../entities/scheduling_requirement.entity';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ScheduleScenariosService } from './schedule-scenarios.service';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import { ScenarioPlanningService } from '../planning/scenario-planning.service';
import { ScenarioAuditService } from './scenario-audit.service';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { SchedulerService } from '../services/scheduler.service';
import { ResourceAssignmentsService } from '../services/resource_assignments.service';
import { SCHEDULER_DOMAIN_EVENT_SCENARIO_PROMOTED } from '../constants';
import { ConstraintConflict } from '../constraints/constraint.types';

@Injectable()
export class PromoteOrchestratorService {
  private readonly logger = new Logger(PromoteOrchestratorService.name);

  constructor(
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
    private readonly scenarios: ScheduleScenariosService,
    private readonly requirements: SchedulingRequirementsService,
    private readonly planning: ScenarioPlanningService,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly execution: SchedulerService,
    private readonly resourceAssignments: ResourceAssignmentsService,
    private readonly audit: ScenarioAuditService,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Promote an active scenario to live (replace-live-for-scope).
   */
  async promote(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      expectedRevision?: number;
      overrideHardConflicts?: boolean;
    },
  ): Promise<{
    promoted: boolean;
    scheduleScenarioId: number;
    requirementId: number;
    promotedTaskIds: number[];
    softConflicts: ConstraintConflict[];
  }> {
    const scenario = await this.scenarios.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    if (scenario.status !== 'active') {
      throw new RpcException('Only an active scenario can be promoted');
    }
    if (
      input.expectedRevision != null &&
      scenario.revision !== input.expectedRevision
    ) {
      throw new RpcException('Scenario revision conflict; reload and retry');
    }

    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    if (requirement.status !== 'open') {
      throw new RpcException(
        `Requirement is ${requirement.status}; promote is not allowed`,
      );
    }

    const policy = requirement.promotePolicy;
    const graph = await this.planning.loadScenarioGraph(
      scenario.scheduleScenarioId,
    );
    if (!graph.plannedTasks.length) {
      throw new RpcException('Scenario has no planned tasks to promote');
    }

    const scopedTaskIds = await this.requirements.resolveScopedTaskIds(
      requirement,
    );
    const scopedSet = new Set(scopedTaskIds);

    const hard: ConstraintConflict[] = [];
    const soft: ConstraintConflict[] = [];
    for (const pt of graph.plannedTasks) {
      if (!scopedSet.has(pt.taskId)) {
        throw new RpcException(
          `Planned task ${pt.taskId} is outside requirement scope`,
        );
      }
      const parentResult = await this.constraints.validatePlacement({
        tenantId: input.tenantId,
        taskId: pt.taskId,
        startUtc: pt.plannedStartUtc,
        endUtc: pt.plannedEndUtc,
        mode: 'parent_window',
        horizonStartUtc: requirement.horizonStartUtc,
        horizonEndUtc: requirement.horizonEndUtc,
      });
      hard.push(...parentResult.hard);
      soft.push(...parentResult.soft);

      for (const shift of pt.shifts ?? []) {
        const shiftResult = await this.constraints.validatePlacement({
          tenantId: input.tenantId,
          taskId: pt.taskId,
          tenantUserId: shift.tenantUserId,
          resourceId: shift.resourceId,
          startUtc: shift.plannedStartUtc,
          endUtc: shift.plannedEndUtc,
          mode: 'shift',
          horizonStartUtc: requirement.horizonStartUtc,
          horizonEndUtc: requirement.horizonEndUtc,
        });
        hard.push(...shiftResult.hard);
        soft.push(...shiftResult.soft);
      }
    }

    if (hard.length) {
      const allowOverride =
        policy.allowHardConflictOverride &&
        input.overrideHardConflicts === true;
      if (!allowOverride) {
        throw new RpcException({
          message: 'Promote blocked by hard conflicts',
          conflicts: hard,
        });
      }
    }

    // In-flight check for scoped tasks intersecting horizon
    const inFlight = await this.schedRepo.find({
      where: {
        taskId: In([...scopedSet]),
        isActive: 1,
        status: In(['running', 'queued', 'paused']),
      },
    });
    const inFlightInHorizon = inFlight.filter(
      (r) =>
        r.effectiveEndUtc >= requirement.horizonStartUtc &&
        r.effectiveStartUtc <= requirement.horizonEndUtc,
    );
    if (inFlightInHorizon.length && policy.inFlight === 'block') {
      throw new RpcException({
        message: 'Promote blocked by in-flight live schedules',
        scheduledTaskIds: inFlightInHorizon.map((r) => r.scheduledTaskId),
      });
    }

    const promotedTaskIds: number[] = [];

    for (const pt of graph.plannedTasks) {
      if (policy.inFlight === 'force_cancel') {
        await this.execution.replaceActiveSchedulesForTask(pt.taskId);
      } else {
        // deactivate prior active rows for this task (no in-flight in scope)
        await this.execution.replaceActiveSchedulesForTask(pt.taskId);
      }

      const parent = await this.execution.scheduleTaskWindow(userId, {
        taskId: pt.taskId,
        requestedStartUtc: pt.plannedStartUtc,
        requestedEndUtc: pt.plannedEndUtc,
        priority: pt.priority,
        parentScheduledTaskId: null,
        replaceExisting: false, // already replaced above
        createdBy: userId,
      });

      const shiftInputs = [];
      for (const shift of [...(pt.shifts ?? [])].sort(
        (a, b) => a.sequenceNo - b.sequenceNo,
      )) {
        let resourceAssignmentId: number | undefined;
        const matchingAssignment = (pt.assignments ?? []).find(
          (a) =>
            a.resourceId === shift.resourceId ||
            (!shift.resourceId && a.resourceId),
        );
        const resourceId =
          shift.resourceId ?? matchingAssignment?.resourceId ?? null;
        if (resourceId) {
          const created = await this.resourceAssignments.create(userId, {
            resourceId,
            scheduledTaskId: parent.scheduledTaskId,
            assignedStart: shift.plannedStartUtc.toISOString(),
            assignedEnd: shift.plannedEndUtc.toISOString(),
          });
          resourceAssignmentId = created.resourceAssignmentId;
        }
        if (!resourceAssignmentId) {
          this.logger.warn(
            `Skipping shift seq ${shift.sequenceNo} for task ${pt.taskId}: no resource assignment`,
          );
          continue;
        }
        if (!shift.tenantUserId) {
          this.logger.warn(
            `Skipping shift seq ${shift.sequenceNo} for task ${pt.taskId}: no tenantUserId`,
          );
          continue;
        }
        shiftInputs.push({
          resourceAssignmentId,
          tenantUserId: shift.tenantUserId,
          plannedStartUtc: shift.plannedStartUtc,
          plannedEndUtc: shift.plannedEndUtc,
          sequenceNo: shift.sequenceNo,
        });
      }

      if (shiftInputs.length) {
        await this.execution.scheduleFromShifts(userId, {
          taskId: pt.taskId,
          parentScheduledTaskId: parent.scheduledTaskId,
          priority: pt.priority,
          shifts: shiftInputs,
        });
      }

      promotedTaskIds.push(pt.taskId);
    }

    await this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const reqRepo = manager.getRepository(SchedulingRequirementEntity);

      if (requirement.finalScenarioId) {
        await scenarioRepo.update(
          { scheduleScenarioId: requirement.finalScenarioId },
          { status: 'archived' },
        );
      }

      scenario.status = 'final';
      scenario.promotedAt = new Date();
      scenario.promotedBy = userId;
      await scenarioRepo.save(scenario);

      requirement.finalScenarioId = scenario.scheduleScenarioId;
      requirement.activeScenarioId = null;
      requirement.syncedToLiveAt = new Date();
      requirement.syncedScenarioRevision = scenario.revision;
      await reqRepo.save(requirement);

      if (policy.archiveOtherDraftsOnPromote) {
        await scenarioRepo
          .createQueryBuilder()
          .update(ScheduleScenarioEntity)
          .set({ status: 'archived' })
          .where('scheduling_requirement_id = :rid', {
            rid: requirement.schedulingRequirementId,
          })
          .andWhere('schedule_scenario_id <> :sid', {
            sid: scenario.scheduleScenarioId,
          })
          .andWhere('status IN (:...statuses)', {
            statuses: ['draft', 'active'],
          })
          .execute();
      }
    });

    const graphJson = {
      plannedTasks: graph.plannedTasks.map((t) => ({
        taskId: t.taskId,
        plannedStartUtc: t.plannedStartUtc,
        plannedEndUtc: t.plannedEndUtc,
        shifts: t.shifts,
        assignments: t.assignments,
      })),
    };
    await this.audit.saveSnapshot({
      scheduleScenarioId: scenario.scheduleScenarioId,
      schedulingRequirementId: requirement.schedulingRequirementId,
      revision: scenario.revision,
      graphJson,
      createdBy: userId,
    });
    await this.audit.appendEvent({
      schedulingRequirementId: requirement.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'promoted',
      payload: { promotedTaskIds, softConflictCount: soft.length },
    });

    this.events.emit(SCHEDULER_DOMAIN_EVENT_SCENARIO_PROMOTED, {
      tenantId: input.tenantId,
      requirementId: requirement.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      promotedTaskIds,
    });

    this.logger.log(
      `Promoted scenario ${scenario.scheduleScenarioId} for requirement ${requirement.schedulingRequirementId}`,
    );

    return {
      promoted: true,
      scheduleScenarioId: scenario.scheduleScenarioId,
      requirementId: requirement.schedulingRequirementId,
      promotedTaskIds,
      softConflicts: soft,
    };
  }
}
