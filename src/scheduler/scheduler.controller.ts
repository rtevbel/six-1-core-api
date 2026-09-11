import { Controller, ParseIntPipe, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './services/scheduler.service';
import { SchedulingRequirementsService } from './requirements/scheduling-requirements.service';
import { ScheduleScenariosService } from './scenarios/schedule-scenarios.service';
import { PromoteOrchestratorService } from './scenarios/promote-orchestrator.service';
import { ScenarioPlanningService } from './planning/scenario-planning.service';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import { ScheduleWindowDto } from './dto/schedule-window.dto';
import { ScheduleFromShiftsDto } from './dto/schedule-from-shifts.dto';
import { PlanProjectDto } from './dto/plan-project.dto';
import { CommitPlanDto } from './dto/commit-plan.dto';
import { FiltersDto } from './dto/filters.dto';
import {
  UtilizationQueryDto,
  ValidatePlacementDto,
} from './dto/validate-placement.dto';
import { RequirePermissions } from '../authorization/authorization.decorator';

import {
  MICROSERVICE_SCHEDULE_TASk_WINDOW_PATTERN,
  MICROSERVICE_SCHEDULE_TASk_FROM_SHIFT_PATTERN,
  MICROSERVICE_PLAN_PROJECT_PATTERN,
  MICROSERVICE_COMMIT_PLAN_PATTERN,
  MICROSERVICE_FIND_ALL_SCHEDULES_PATTERN,
  MICROSERVICE_FIND_ONE_SCHEDULE_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TASK_PATTERN,
  MICROSERVICE_RESCHEDULE_PATTERN,
  MICROSERVICE_PAUSE_PATTERN,
  MICROSERVICE_RESUME_PATTERN,
  MICROSERVICE_CANCEL_PATTERN,
  MICROSERVICE_VALIDATE_PLACEMENT_PATTERN,
  MICROSERVICE_UTILIZATION_PATTERN,
} from './constants';

@Controller('scheduler')
@UseFilters(AppRpcExceptionsFilter)
export class SchedulerController {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly requirements: SchedulingRequirementsService,
    private readonly scenarios: ScheduleScenariosService,
    private readonly promote: PromoteOrchestratorService,
    private readonly planning: ScenarioPlanningService,
  ) {}

  @MessagePattern(MICROSERVICE_SCHEDULE_TASk_WINDOW_PATTERN)
  @RequirePermissions('scheduler.create')
  @UsePipes(AppRpcValidationPipe)
  async scheduleTaskWindow(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createSchedulerDto: ScheduleWindowDto,
  ): Promise<Record<string, unknown>> {
    const res = await this.scheduler.scheduleTaskWindow(userId, {
      taskId: createSchedulerDto.taskId,
      requestedStartUtc: new Date(createSchedulerDto.requestedStartUtc),
      requestedEndUtc: new Date(createSchedulerDto.requestedEndUtc),
      priority: createSchedulerDto.priority ?? 0,
      parentScheduledTaskId: createSchedulerDto.parentScheduledTaskId,
      processTemplateId: createSchedulerDto.processTemplateId,
      createdBy: createSchedulerDto.createdBy,
    });

    return {
      message: 'Scheduled with constraint + calendar gating',
      ...res,
    };
  }

  @MessagePattern(MICROSERVICE_SCHEDULE_TASk_FROM_SHIFT_PATTERN)
  @RequirePermissions('scheduler.create')
  @UsePipes(AppRpcValidationPipe)
  async scheduleFromShifts(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') scheduleFromShiftsDto: ScheduleFromShiftsDto,
  ) {
    const mappedShifts = scheduleFromShiftsDto.shifts.map((s) => ({
      resourceAssignmentId: s.resourceAssignmentId,
      tenantUserId: s.tenantUserId,
      plannedStartUtc: new Date(s.plannedStartUtc),
      plannedEndUtc: new Date(s.plannedEndUtc),
      sequenceNo: s.sequenceNo ?? 1,
    }));

    return this.scheduler.scheduleFromShifts(userId, {
      taskId: scheduleFromShiftsDto.taskId,
      parentScheduledTaskId: scheduleFromShiftsDto.parentScheduledTaskId,
      priority: scheduleFromShiftsDto.priority ?? 0,
      shifts: mappedShifts,
    });
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_SCHEDULES_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersDto,
  ) {
    return this.scheduler.findAll(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TASK_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findAllByTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersDto,
  ) {
    return this.scheduler.findAllByTask(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_SCHEDULE_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.findOne(userId, dto.scheduledTaskId);
  }

  @MessagePattern(MICROSERVICE_RESCHEDULE_PATTERN)
  @RequirePermissions('scheduler.update')
  @UsePipes(AppRpcValidationPipe)
  async reschedule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    dto: {
      scheduledTaskId: number;
      requestedStartUtc: string;
      requestedEndUtc: string;
    },
  ) {
    return this.scheduler.reschedule(userId, {
      scheduledTaskId: dto.scheduledTaskId,
      requestedStartUtc: new Date(dto.requestedStartUtc),
      requestedEndUtc: new Date(dto.requestedEndUtc),
    });
  }

  @MessagePattern(MICROSERVICE_PAUSE_PATTERN)
  @RequirePermissions('scheduler.update')
  @UsePipes(AppRpcValidationPipe)
  async pause(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number; pausedUntilUtc: string },
  ) {
    return this.scheduler.pause(userId, {
      scheduledTaskId: dto.scheduledTaskId,
      pausedUntilUtc: new Date(dto.pausedUntilUtc),
    });
  }

  @MessagePattern(MICROSERVICE_RESUME_PATTERN)
  @RequirePermissions('scheduler.update')
  @UsePipes(AppRpcValidationPipe)
  async resume(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.resume(userId, {
      scheduledTaskId: dto.scheduledTaskId,
    });
  }

  @MessagePattern(MICROSERVICE_CANCEL_PATTERN)
  @RequirePermissions('scheduler.delete')
  @UsePipes(AppRpcValidationPipe)
  async cancel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.cancel(userId, {
      scheduledTaskId: dto.scheduledTaskId,
    });
  }

  @MessagePattern(MICROSERVICE_VALIDATE_PLACEMENT_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async validatePlacement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ValidatePlacementDto,
  ) {
    return this.scheduler.validatePlacement(userId, {
      tenantId: dto.tenantId,
      taskId: dto.taskId,
      tenantUserId: dto.tenantUserId,
      resourceId: dto.resourceId,
      startUtc: new Date(dto.startUtc),
      endUtc: new Date(dto.endUtc),
      teamId: dto.teamId,
      mode: dto.mode,
      excludeScheduledTaskIds: dto.excludeScheduledTaskIds,
      horizonStartUtc: dto.horizonStartUtc
        ? new Date(dto.horizonStartUtc)
        : undefined,
      horizonEndUtc: dto.horizonEndUtc
        ? new Date(dto.horizonEndUtc)
        : undefined,
    });
  }

  @MessagePattern(MICROSERVICE_UTILIZATION_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async utilization(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UtilizationQueryDto,
  ) {
    return this.scheduler.utilization(userId, {
      tenantId: dto.tenantId,
      fromUtc: new Date(dto.fromUtc),
      toUtc: new Date(dto.toUtc),
      resourceIds: dto.resourceIds,
      tenantUserIds: dto.tenantUserIds,
      teamId: dto.teamId,
    });
  }

  /**
   * Compatibility alias: create a project-scoped requirement + active scenario from live.
   */
  @MessagePattern(MICROSERVICE_PLAN_PROJECT_PATTERN)
  @RequirePermissions('scheduler.create')
  @UsePipes(AppRpcValidationPipe)
  async planProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') planProjectDto: PlanProjectDto,
  ) {
    const horizonDays = planProjectDto.horizonDays ?? 30;
    const horizonStartUtc = new Date();
    const horizonEndUtc = new Date(
      horizonStartUtc.getTime() + horizonDays * 24 * 60 * 60 * 1000,
    );

    const requirement = await this.requirements.create(userId, {
      tenantId: planProjectDto.tenantId,
      name: `Project ${planProjectDto.projectId} plan`,
      scopeType: 'project',
      primaryProjectId: planProjectDto.projectId,
      horizonStartUtc,
      horizonEndUtc,
    });

    const scenario = await this.scenarios.create(userId, {
      tenantId: planProjectDto.tenantId,
      schedulingRequirementId: requirement.schedulingRequirementId,
      name: `Project ${planProjectDto.projectId} active scenario`,
      from: 'live',
      activate: true,
    });

    const planned = await this.planning.findPlannedTasks(userId, {
      tenantId: planProjectDto.tenantId,
      scheduleScenarioId: scenario.scheduleScenarioId,
    });
    const shifts = planned.reduce(
      (n, t) => n + (t.shifts?.length ?? 0),
      0,
    );

    return {
      planId: scenario.scheduleScenarioId,
      requirementId: requirement.schedulingRequirementId,
      summary: {
        tasks: planned.length,
        shifts,
        conflicts: [],
      },
    };
  }

  /**
   * Compatibility alias: promote scenario `planId` to live.
   */
  @MessagePattern(MICROSERVICE_COMMIT_PLAN_PATTERN)
  @RequirePermissions('scheduler.promote')
  @UsePipes(AppRpcValidationPipe)
  async commitPlan(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') commitPlanDto: CommitPlanDto,
  ) {
    const result = await this.promote.promote(userId, {
      tenantId: commitPlanDto.tenantId,
      scheduleScenarioId: commitPlanDto.planId,
    });
    return { committed: true, ...result };
  }
}
