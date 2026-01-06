import { Controller, ParseIntPipe, UsePipes, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResourceAssignmentsService } from '../services/resource_assignments.service';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { CreateResourceAssignmentDto } from '../dto/create-resource-assignment.dto';
import { UpdateResourceAssignmentDto } from '../dto/update-resource-assignment.dto';
import { FiltersResourceAssignmentDto } from '../dto/filters-resource-assignment.dto';

import {
  MICROSERVICE_CREATE_RESOURCE_ASSIGNMENT_PATTERN,
  MICROSERVICE_FIND_ALL_RESOURCE_ASSIGNMENTS_PATTERN,
  MICROSERVICE_FIND_ONE_RESOURCE_ASSIGNMENT_PATTERN,
  MICROSERVICE_UPDATE_RESOURCE_ASSIGNMENT_PATTERN,
  MICROSERVICE_REMOVE_RESOURCE_ASSIGNMENT_PATTERN,
} from '../constants';

@Controller('resource-assignments')
@UseFilters(AppRpcExceptionsFilter)
export class ResourceAssignmentsController {
  constructor(
    private readonly resourceAssignmentsService: ResourceAssignmentsService,
  ) {}

  /**
   * Handles the create resource assignment message pattern.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing resource assignment details.
   * @returns The created resource assignment entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_RESOURCE_ASSIGNMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateResourceAssignmentDto,
  ) {
    return this.resourceAssignmentsService.create(userId, createDto);
  }

  /**
   * Handles the find all resource assignments message pattern.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A list of resource assignments matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_RESOURCE_ASSIGNMENTS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersResourceAssignmentDto,
  ) {
    return this.resourceAssignmentsService.findAll(userId, filtersDto);
  }

  /**
   * Handles the find one resource assignment message pattern.
   * @param userId - ID of the user requesting the data.
   * @param dto - Data containing the resource assignment ID.
   * @returns The resource assignment entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_RESOURCE_ASSIGNMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { resourceAssignmentId: number },
  ) {
    return this.resourceAssignmentsService.findOne(
      userId,
      dto.resourceAssignmentId,
    );
  }

  /**
   * Handles the update resource assignment message pattern.
   * @param userId - ID of the user updating the record.
   * @param dto - Data containing resource assignment ID and update details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_RESOURCE_ASSIGNMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    dto: { resourceAssignmentId: number } & UpdateResourceAssignmentDto,
  ) {
    const { resourceAssignmentId, ...updateDto } = dto;
    return this.resourceAssignmentsService.update(
      userId,
      resourceAssignmentId,
      updateDto,
    );
  }

  /**
   * Handles the remove resource assignment message pattern.
   * @param userId - ID of the user deleting the record.
   * @param dto - Data containing the resource assignment ID.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_RESOURCE_ASSIGNMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { resourceAssignmentId: number },
  ) {
    return this.resourceAssignmentsService.remove(
      userId,
      dto.resourceAssignmentId,
    );
  }
}
