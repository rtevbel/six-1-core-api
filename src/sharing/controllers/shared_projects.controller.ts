import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { SharedProjectsService } from '../services/shared_projects.service';
import { CreateSharedProjectDto } from '../dto/shared-projects/create-shared-project.dto';
import { FiltersSharedProjectDto } from '../dto/shared-projects/filters-shared-project.dto';
import { UpdateSharedProjectDto } from '../dto/shared-projects/update-shared-project.dto';
import {
  MICROSERVICE_CREATE_SHARED_PROJECT_PATTERN,
  MICROSERVICE_FIND_ALL_SHARED_PROJECTS_PATTERN,
  MICROSERVICE_FIND_ONE_SHARED_PROJECT_PATTERN,
  MICROSERVICE_UPDATE_SHARED_PROJECT_PATTERN,
  MICROSERVICE_REMOVE_SHARED_PROJECT_PATTERN,
} from '../constants';

/**
 * Controller responsible for handling RPC operations for shared projects.
 *
 * Follows the same commenting and structure conventions as the events controller:
 *  - Exposes CRUD-style handlers via message patterns.
 *  - Passes `userId` from the payload to the underlying service.
 *  - Applies validation with `AppRpcValidationPipe`.
 */
@Controller('shared-projects')
@UseFilters(AppRpcExceptionsFilter)
export class SharedProjectsController {
  constructor(private readonly sharedProjectsService: SharedProjectsService) {}

  /**
   * Creates a new shared project definition.
   * @param userId - ID of the user making the request.
   * @param dto - DTO containing configuration for sharing a project.
   * @returns The created shared project entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_SHARED_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSharedProjectDto,
  ) {
    return this.sharedProjectsService.create(userId, dto);
  }

  /**
   * Retrieves shared projects according to the provided filters.
   * @param userId - ID of the user making the request.
   * @param filters - Filters for pagination, sorting and narrowing the results.
   * @returns A list of shared projects and pagination data.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SHARED_PROJECTS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersSharedProjectDto,
  ) {
    return this.sharedProjectsService.findAll(userId, filters);
  }

  /**
   * Retrieves a single shared project by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` of the record to fetch.
   * @returns The shared project entity if found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SHARED_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedProjectsService.findOne(userId, dto.sharingId);
  }

  /**
   * Updates an existing shared project record.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing `sharingId` and the update payload.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SHARED_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number } & UpdateSharedProjectDto,
  ) {
    const { sharingId, ...payload } = dto;
    return this.sharedProjectsService.update(userId, sharingId, payload);
  }

  /**
   * Deletes a shared project by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SHARED_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedProjectsService.remove(userId, dto.sharingId);
  }
}
