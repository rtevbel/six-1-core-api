import { Controller, ParseIntPipe, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './services/scheduler.service';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import {ScheduleWindowDto} from "./dto/schedule-window.dto";
import {ScheduleFromShiftsDto} from "./dto/schedule-from-shifts.dto";
import {PlanProjectDto} from "./dto/plan-project.dto";
import {CommitPlanDto} from "./dto/commit-plan.dto";
import { FiltersDto } from './dto/filters.dto';

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
  MICROSERVICE_CANCEL_PATTERN
} from './constants';

@Controller('scheduler')
@UseFilters(AppRpcExceptionsFilter)
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  /**
   * Handles scheduling a task window.
   * @param userId - ID of the user making the request.
   * @param ScheduleWindowDto - Data transfer object containing scheduling details.
   * @returns The result of the scheduling operation.
   */
  @MessagePattern(MICROSERVICE_SCHEDULE_TASk_WINDOW_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async scheduleTaskWindow(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createSchedulerDto: ScheduleWindowDto,
  ): Promise<any> {
    const res = await this.scheduler.scheduleTaskWindow(userId, {
      taskId: createSchedulerDto.taskId,
      requestedStartUtc: new Date(createSchedulerDto.requestedStartUtc),
      requestedEndUtc: new Date(createSchedulerDto.requestedEndUtc),
      priority: createSchedulerDto.priority ?? 0,
    });

    return {
      message: 'Scheduled with dependency + calendar gating',
      ...res,
    };
  }

  /**
   * Handles the ScheduleTaskFromShifts message pattern.
   *
   * @param ScheduleFromShiftsDto - The data transfer object containing the task and shift details.
   * Processes a request to schedule a task based on provided shift data.
   */
  @MessagePattern(MICROSERVICE_SCHEDULE_TASk_FROM_SHIFT_PATTERN)
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

  /** Find all schedules (tenant scope) */
  @MessagePattern(MICROSERVICE_FIND_ALL_SCHEDULES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersDto,
  ) {
    return this.scheduler.findAll(userId, dto);
  }

  /** Find schedules by task */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TASK_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAllByTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersDto,
  ) {
    return this.scheduler.findAllByTask(userId, dto);
  }

  /** Find one schedule by id */
  @MessagePattern(MICROSERVICE_FIND_ONE_SCHEDULE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.findOne(userId, dto.scheduledTaskId);
  }

  /** Reschedule an existing scheduled row */
  @MessagePattern(MICROSERVICE_RESCHEDULE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async reschedule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number; requestedStartUtc: string; requestedEndUtc: string },
  ) {
    return this.scheduler.reschedule(userId, {
      scheduledTaskId: dto.scheduledTaskId,
      requestedStartUtc: new Date(dto.requestedStartUtc),
      requestedEndUtc: new Date(dto.requestedEndUtc),
    });
  }

  /** Pause a schedule */
  @MessagePattern(MICROSERVICE_PAUSE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async pause(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number; pausedUntilUtc: string },
  ) {
    return this.scheduler.pause(userId, { scheduledTaskId: dto.scheduledTaskId, pausedUntilUtc: new Date(dto.pausedUntilUtc) });
  }

  /** Resume a schedule */
  @MessagePattern(MICROSERVICE_RESUME_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async resume(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.resume(userId, { scheduledTaskId: dto.scheduledTaskId });
  }

  /** Cancel a schedule */
  @MessagePattern(MICROSERVICE_CANCEL_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async cancel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { scheduledTaskId: number },
  ) {
    return this.scheduler.cancel(userId, { scheduledTaskId: dto.scheduledTaskId });
  }

  /**
   * Handles the PlanProject message pattern.
   *
   * @param PlanProjectDto - The data transfer object containing project planning details (not used in this example).
   * Returns a mock response with a plan summary.
   */
  @MessagePattern(MICROSERVICE_PLAN_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async planProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') planProjectDto: PlanProjectDto,
  ) {
    return { planId: 1, summary: { tasks: 0, shifts: 0, conflicts: [] } }; // Mock response
  }

  /**
   * Handles the CommitPlan message pattern.
   *
   * @param CommitPlanDto - The data transfer object containing plan commit details (not used in this example).
   * Returns a mock response indicating the plan was committed.
   */
  @MessagePattern(MICROSERVICE_COMMIT_PLAN_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async commitPlan(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') commitPlanDto: CommitPlanDto,
  ) {
    return { committed: true }; // Mock response
  }
}
