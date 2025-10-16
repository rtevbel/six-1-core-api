import {
  Controller,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './services/scheduler.service';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

import {
  MICROSERVICE_SCHEDULE_TASK_WINDOW_PATTERN,
} from './constants';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  /**
   * Handles scheduling a task window.
   * @param userId - ID of the user making the request.
   * @param createSchedulerDto - Data transfer object containing scheduling details.
   * @returns The result of the scheduling operation.
   */
  @MessagePattern(MICROSERVICE_SCHEDULE_TASK_WINDOW_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async scheduleTaskWindow(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createSchedulerDto: CreateSchedulerDto,
  ): Promise<any> {
    const res = await this.scheduler.scheduleTaskWindow({
      taskId: createSchedulerDto.taskId,
      taskStatusId: createSchedulerDto.taskStatusId,
      requestedStartUtc: new Date(createSchedulerDto.requestedStartUtc),
      requestedEndUtc: new Date(createSchedulerDto.requestedEndUtc),
      priority: createSchedulerDto.priority ?? 0,
    });

    return {
      message: 'Scheduled with dependency + calendar gating',
      ...res,
    };
  }
}