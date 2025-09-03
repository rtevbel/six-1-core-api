import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProjectEntity } from './entities/project.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROJECT_PATTERN,
  MICROSERVICE_FIND_ALL_PROJECT_PATTERN,
  MICROSERVICE_FIND_ONE_PROJECT_PATTERN,
  MICROSERVICE_UPDATE_PROJECT_PATTERN,
  MICROSERVICE_REMOVE_PROJECT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Handles the creation of a new project.
   * @param userId - ID of the user making the request.
   * @param createProjectDto - Data transfer object containing project details.
   * @returns The created project entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProjectDto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(userId, createProjectDto);
  }

  /**
   * Retrieves all projects based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying projects.
   * @returns A list of projects matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProjects(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.projectsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single project by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the project to retrieve.
   * @returns The project entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROJECT_PATTERN)
  findOneProject(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<ProjectEntity | NotFoundException> {
    return this.projectsService.findOne(userId, id);
  }

  /**
   * Updates an existing project.
   * @param userId - ID of the user making the request.
   * @param updateProjectDto - Data transfer object containing updated project details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProject(
    @Payload('userId') userId: number,
    @Payload('data') updateProjectDto: UpdateProjectDto,
  ): Promise<UpdateResult> {
    return this.projectsService.update(
      userId,
      updateProjectDto.projectId,
      updateProjectDto,
    );
  }

  /**
   * Deletes a project by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the project to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROJECT_PATTERN)
  removeProject(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.projectsService.remove(userId, id);
  }
}