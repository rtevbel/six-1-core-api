import { Controller, ParseIntPipe, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResourcesService } from '../services/resources.service';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { FiltersResourceDto } from '../dto/filters-resource.dto';

import {
  MICROSERVICE_CREATE_RESOURCE_PATTERN,
  MICROSERVICE_FIND_ALL_RESOURCES_PATTERN,
  MICROSERVICE_FIND_ONE_RESOURCE_PATTERN,
  MICROSERVICE_UPDATE_RESOURCE_PATTERN,
  MICROSERVICE_REMOVE_RESOURCE_PATTERN,
} from '../constants';

@Controller('resources')
@UseFilters(AppRpcExceptionsFilter)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * Handles the create resource message pattern.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing resource details.
   * @returns The created resource entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateResourceDto,
  ) {
    return this.resourcesService.create(userId, createDto);
  }

  /**
   * Handles the find all resources message pattern.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A list of resources matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_RESOURCES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersResourceDto,
  ) {
    return this.resourcesService.findAll(userId, filtersDto);
  }

  /**
   * Handles the find one resource message pattern.
   * @param userId - ID of the user requesting the data.
   * @param dto - Data containing the resource ID.
   * @returns The resource entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { resourceId: number },
  ) {
    return this.resourcesService.findOne(userId, dto.resourceId);
  }

  /**
   * Handles the update resource message pattern.
   * @param userId - ID of the user updating the record.
   * @param dto - Data containing resource ID and update details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { resourceId: number } & UpdateResourceDto,
  ) {
    const { resourceId, ...updateDto } = dto;
    return this.resourcesService.update(userId, resourceId, updateDto);
  }

  /**
   * Handles the remove resource message pattern.
   * @param userId - ID of the user deleting the record.
   * @param dto - Data containing the resource ID.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_RESOURCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { resourceId: number },
  ) {
    return this.resourcesService.remove(userId, dto.resourceId);
  }
}

