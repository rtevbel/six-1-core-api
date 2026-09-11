import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { ScenarioPlanningService } from './scenario-planning.service';
import {
  FindScenarioPlannedTasksDto,
  RemoveScenarioPlannedTaskDto,
  UpsertScenarioPlannedTaskDto,
} from '../dto/scenario-planning.dto';
import {
  MICROSERVICE_FIND_SCENARIO_PLANNED_TASKS_PATTERN,
  MICROSERVICE_REMOVE_SCENARIO_PLANNED_TASK_PATTERN,
  MICROSERVICE_UPSERT_SCENARIO_PLANNED_TASK_PATTERN,
} from '../constants';

@Controller('scenario-planning')
@UseFilters(AppRpcExceptionsFilter)
export class ScenarioPlanningController {
  constructor(private readonly planningService: ScenarioPlanningService) {}

  /**
   * Upsert a planned task (parent window + optional shifts/assignments).
   */
  @MessagePattern(MICROSERVICE_UPSERT_SCENARIO_PLANNED_TASK_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async upsertPlannedTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpsertScenarioPlannedTaskDto,
  ) {
    return this.planningService.upsertPlannedTask(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
      plannedStartUtc: new Date(dto.plannedStartUtc),
      plannedEndUtc: new Date(dto.plannedEndUtc),
      tzUsed: dto.tzUsed,
      priority: dto.priority,
      taskStatusId: dto.taskStatusId,
      notes: dto.notes,
      shifts: dto.shifts?.map((s) => ({
        sequenceNo: s.sequenceNo,
        tenantUserId: s.tenantUserId,
        resourceId: s.resourceId,
        plannedStartUtc: new Date(s.plannedStartUtc),
        plannedEndUtc: new Date(s.plannedEndUtc),
      })),
      assignments: dto.assignments?.map((a) => ({
        resourceId: a.resourceId,
        assignedStart: new Date(a.assignedStart),
        assignedEnd: new Date(a.assignedEnd),
        scenarioPlannedShiftId: a.scenarioPlannedShiftId,
      })),
    });
  }

  /**
   * Remove a planned task from a scenario.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SCENARIO_PLANNED_TASK_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async removePlannedTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: RemoveScenarioPlannedTaskDto,
  ) {
    return this.planningService.removePlannedTask(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      taskId: dto.taskId,
    });
  }

  /**
   * List planned tasks for a scenario (with shifts and assignments).
   */
  @MessagePattern(MICROSERVICE_FIND_SCENARIO_PLANNED_TASKS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findPlannedTasks(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FindScenarioPlannedTasksDto,
  ) {
    return this.planningService.findPlannedTasks(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
    });
  }
}
