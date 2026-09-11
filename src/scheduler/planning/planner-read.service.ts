import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import { ScheduleScenariosService } from '../scenarios/schedule-scenarios.service';
import { ScenarioPlanningService } from './scenario-planning.service';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import {
  SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED,
} from '../constants';
import { ConstraintConflict } from '../constraints/constraint.types';

/**
 * Phase 2 planner read models (board / conflicts) for FE and gateway.
 */
@Injectable()
export class PlannerReadService {
  constructor(
    private readonly requirements: SchedulingRequirementsService,
    private readonly scenarios: ScheduleScenariosService,
    private readonly planning: ScenarioPlanningService,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly events: EventEmitter2,
  ) {}

  async getBoard(
    userId: number,
    input: {
      tenantId: number;
      schedulingRequirementId: number;
      scheduleScenarioId?: number;
    },
  ): Promise<Record<string, unknown>> {
    const requirement = await this.requirements.findOne(
      userId,
      input.schedulingRequirementId,
      input.tenantId,
    );
    const scenarioId =
      input.scheduleScenarioId ??
      requirement.activeScenarioId ??
      requirement.finalScenarioId;
    if (!scenarioId) {
      return {
        requirement,
        scenario: null,
        plannedTasks: [],
        conflictSummary: { hard: 0, soft: 0 },
      };
    }

    const scenario = await this.scenarios.findOne(
      userId,
      scenarioId,
      input.tenantId,
    );
    const plannedTasks = await this.planning.findPlannedTasks(userId, {
      tenantId: input.tenantId,
      scheduleScenarioId: scenarioId,
    });

    let hard = 0;
    let soft = 0;
    for (const pt of plannedTasks) {
      const summary = pt.conflictSummary as
        | { hard?: unknown[]; soft?: unknown[] }
        | null;
      hard += Array.isArray(summary?.hard) ? summary!.hard!.length : 0;
      soft += Array.isArray(summary?.soft) ? summary!.soft!.length : 0;
    }

    return {
      requirement,
      scenario,
      plannedTasks,
      horizon: {
        startUtc: requirement.horizonStartUtc,
        endUtc: requirement.horizonEndUtc,
      },
      conflictSummary: { hard, soft },
    };
  }

  async getConflicts(
    userId: number,
    input: {
      tenantId: number;
      schedulingRequirementId: number;
      scheduleScenarioId?: number;
    },
  ): Promise<{ conflicts: ConstraintConflict[]; count: number }> {
    const requirement = await this.requirements.findOneOrFail(
      input.schedulingRequirementId,
      input.tenantId,
    );
    const scenarioId =
      input.scheduleScenarioId ??
      requirement.activeScenarioId ??
      requirement.finalScenarioId;
    if (!scenarioId) {
      return { conflicts: [], count: 0 };
    }

    const plannedTasks = await this.planning.findPlannedTasks(userId, {
      tenantId: input.tenantId,
      scheduleScenarioId: scenarioId,
    });

    const placements = [];
    for (const pt of plannedTasks) {
      placements.push({
        key: `task:${pt.taskId}`,
        taskId: pt.taskId,
        startUtc: pt.plannedStartUtc,
        endUtc: pt.plannedEndUtc,
      });
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
    }

    const conflicts = await this.constraints.findConflicts({
      tenantId: input.tenantId,
      placements,
    });

    this.events.emit(SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED, {
      tenantId: input.tenantId,
      requirementId: input.schedulingRequirementId,
      scheduleScenarioId: scenarioId,
      count: conflicts.length,
    });

    return { conflicts, count: conflicts.length };
  }
}
