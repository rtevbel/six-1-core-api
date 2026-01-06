import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { SharedResourcesService } from '../services/shared_resources.service';
import { CreateSharedResourceDto } from '../dto/shared-resources/create-shared-resource.dto';
import { FiltersSharedResourceDto } from '../dto/shared-resources/filters-shared-resource.dto';
import { UpdateSharedResourceDto } from '../dto/shared-resources/update-shared-resource.dto';
import {
  MICROSERVICE_CREATE_SHARED_RESOURCE_PATTERN,
  MICROSERVICE_FIND_ALL_SHARED_RESOURCES_PATTERN,
  MICROSERVICE_FIND_ONE_SHARED_RESOURCE_PATTERN,
  MICROSERVICE_UPDATE_SHARED_RESOURCE_PATTERN,
  MICROSERVICE_REMOVE_SHARED_RESOURCE_PATTERN,
} from '../constants';

/**
 * Controller responsible for handling RPC operations for shared resources.
 *
 * Mirrors the structure and commenting style of the events controller:
 *  - All handlers are exposed via message patterns.
 *  - `userId` is taken from the RPC payload and passed through to the service.
 *  - Validation is handled via `AppRpcValidationPipe`.
 */
@Controller('shared-resources')
@UseFilters(AppRpcExceptionsFilter)
export class SharedResourcesController {
  constructor(
    private readonly sharedResourcesService: SharedResourcesService,
  ) {}

  /**
   * Creates a new shared resource entry.
   * @param userId - ID of the user making the request.
   * @param dto - DTO containing shared resource configuration.
   * @returns The created shared resource entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_SHARED_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSharedResourceDto,
  ) {
    return this.sharedResourcesService.create(userId, dto);
  }

  /**
   * Retrieves shared resources using the provided filters.
   * @param userId - ID of the user making the request.
   * @param filters - Filters for pagination, sorting and narrowing the results.
   * @returns A list of shared resources and pagination metadata.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SHARED_RESOURCES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersSharedResourceDto,
  ) {
    return this.sharedResourcesService.findAll(userId, filters);
  }

  /**
   * Retrieves a single shared resource by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` to look up.
   * @returns The shared resource entity if found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SHARED_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedResourcesService.findOne(userId, dto.sharingId);
  }

  /**
   * Updates an existing shared resource.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing `sharingId` and the update payload.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SHARED_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number } & UpdateSharedResourceDto,
  ) {
    const { sharingId, ...payload } = dto;
    return this.sharedResourcesService.update(userId, sharingId, payload);
  }

  /**
   * Deletes a shared resource by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SHARED_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedResourcesService.remove(userId, dto.sharingId);
  }
}
