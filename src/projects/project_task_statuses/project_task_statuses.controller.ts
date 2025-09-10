import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectTaskStatusesService } from './project_task_statuses.service';
import { CreateProjectTaskStatusDto } from './dto/create-project_task_status.dto';
import { UpdateProjectTaskStatusDto } from './dto/update-project_task_status.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProjectTaskStatusEntity } from './entities/project_task_status.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { CreateProjectTaskDefaultStatusDto } from './dto/create-project_task_default_status.dto';

import {
  MICROSERVICE_CREATE_PROJECT_TASK_STATUS_PATTERN,
  MICROSERVICE_FIND_ALL_PROJECT_TASK_STATUS_PATTERN,
  MICROSERVICE_FIND_ONE_PROJECT_TASK_STATUS_PATTERN,
  MICROSERVICE_UPDATE_PROJECT_TASK_STATUS_PATTERN,
  MICROSERVICE_REMOVE_PROJECT_TASK_STATUS_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { OnEvent } from '@nestjs/event-emitter';


@Controller('project-task-statuses')
export class ProjectTaskStatusesController {
  constructor(
    private readonly projectTaskStatusesService: ProjectTaskStatusesService,
  ) {}

  /**
   * Handles the creation of a new project task status.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing task status details.
   * @returns The created project task status entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROJECT_TASK_STATUS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProjectTaskStatus(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProjectTaskStatusDto,
  ): Promise<ProjectTaskStatusEntity> {
    return this.projectTaskStatusesService.create(userId, createDto);
  }

  /**
   * Retrieves all project task statuses based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying task statuses.
   * @returns A list of task statuses matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROJECT_TASK_STATUS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProjectTaskStatuses(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.projectTaskStatusesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single project task status by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the task status to retrieve.
   * @returns The task status entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROJECT_TASK_STATUS_PATTERN)
  findOneProjectTaskStatus(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<ProjectTaskStatusEntity | NotFoundException> {
    return this.projectTaskStatusesService.findOne(userId, id);
  }

  /**
   * Updates an existing project task status.
   * @param userId - ID of the user making the request.
   * @param updateDto - Data transfer object containing updated task status details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROJECT_TASK_STATUS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProjectTaskStatus(
    @Payload('userId') userId: number,
    @Payload('data') updateDto: UpdateProjectTaskStatusDto,
  ): Promise<UpdateResult> {
    return this.projectTaskStatusesService.update(
      userId,
      updateDto.projectTaskStatusId,
      updateDto,
    );
  }

  /**
   * Deletes a project task status by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the task status to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROJECT_TASK_STATUS_PATTERN)
  removeProjectTaskStatus(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.projectTaskStatusesService.remove(userId, id);
  }

  /**
   * Handles the creation of default task statuses for a new project.
   * This function listens to the 'project.create_default_task_statuses' event.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing project details.
   * @returns A promise that resolves when all default task statuses are created.
   */
  @OnEvent('project.create_default_task_statuses')
  async createDefaultProjectTaskStatuses(
    @Payload('data') payload: any,
  ): Promise<void> {
    const userId = Number(payload.userId);
    const createDto: CreateProjectTaskDefaultStatusDto = payload.data;
      await this.projectTaskStatusesService.createDefault(userId, createDto);
      console.log('Default task statuses created');
  }
  
}
