import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FiltersDto } from './dto/filters.dto';
import { TaskEntity } from './entities/task.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RequirePermissions } from '../../authorization/authorization.decorator';

import {
  MICROSERVICE_CREATE_PROJECT_TASK_PATTERN,
  MICROSERVICE_FIND_ALL_PROJECT_TASK_PATTERN,
  MICROSERVICE_FIND_ONE_PROJECT_TASK_PATTERN,
  MICROSERVICE_UPDATE_PROJECT_TASK_PATTERN,
  MICROSERVICE_REMOVE_PROJECT_TASK_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { OnEvent } from '@nestjs/event-emitter';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Handles the creation of a new task.
   * @param userId - ID of the user making the request.
   * @param createTaskDto - Data transfer object containing task details.
   * @returns The created task entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROJECT_TASK_PATTERN)
  @RequirePermissions('tasks.create')
  @UsePipes(AppRpcValidationPipe)
  createTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTaskDto: CreateTaskDto,
  ): Promise<TaskEntity> {
    return this.tasksService.create(userId, createTaskDto);
  }

  /**
   * Retrieves all tasks based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying tasks.
   * @returns A list of tasks matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROJECT_TASK_PATTERN)
  @RequirePermissions('tasks.read')
  @UsePipes(AppRpcValidationPipe)
  findAllTasks(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.tasksService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single task by ID.
   * @param userId - ID of the user making the request.
   * @param projectId - ID of the project the task belongs to.
   * @param id - ID of the task to retrieve.
   * @returns The task entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROJECT_TASK_PATTERN)
  @RequirePermissions('tasks.read')
  findOneTask(
    @Payload('userId') userId: number,
    @Payload('projectId') projectId: number,
    @Payload('data') id: number,
  ): Promise<TaskEntity | NotFoundException> {
    return this.tasksService.findOne(userId, projectId, id);
  }

  /**
   * Updates an existing task.
   * @param userId - ID of the user making the request.
   * @param updateTaskDto - Data transfer object containing updated task details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROJECT_TASK_PATTERN)
  @RequirePermissions('tasks.update')
  @UsePipes(AppRpcValidationPipe)
  updateTask(
    @Payload('userId') userId: number,
    @Payload('projectId') projectId: number,
    @Payload('data') updateTaskDto: UpdateTaskDto,
  ): Promise<UpdateResult> {
    return this.tasksService.update(
      userId,
      projectId,
      updateTaskDto.taskId,
      updateTaskDto,
    );
  }

  /**
   * Deletes a task by ID.
   * @param userId - ID of the user making the request.
   * @param projectId - ID of the project the task belongs to.
   * @param id - ID of the task to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROJECT_TASK_PATTERN)
  @RequirePermissions('tasks.delete')
  removeTask(
    @Payload('userId') userId: number,
    @Payload('projectId') projectId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.tasksService.remove(userId, projectId, id);
  }

  /**
   * Handles the generation of tasks for all process template steps.
   * This function listens to the 'process.generate_tasks' event.
   * @param userId - ID of the user initiating the process.
   * @param projectId - ID of the project for which tasks are to be generated.
   * @param processTemplateId - ID of the process template containing the steps.
   */
  @OnEvent('process.generate_tasks')
  async generateTasksForProcessTemplateSteps(
    @Payload('data') payload: any,
  ): Promise<void> {
    const userId: number = payload.userId;
    const projectId: number = payload.projectId;
    const processTemplateId: number = payload.processTemplateId;
    await this.tasksService.generateTasksForProcessTemplateSteps(
      userId,
      projectId,
      processTemplateId,
    );
    console.log('Default tasks created');
  }
}
