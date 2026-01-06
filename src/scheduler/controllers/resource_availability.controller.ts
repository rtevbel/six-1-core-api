import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { ResourceAvailabilityService } from '../services/resource_availability.service';
import { CreateResourceAvailabilityDto } from '../dto/create-resource-availability.dto';
import { FiltersResourceAvailabilityDto } from '../dto/filters-resource-availability.dto';
import { UpdateResourceAvailabilityDto } from '../dto/update-resource-availability.dto';
import {
  MICROSERVICE_CREATE_RESOURCE_AVAILABILITY_PATTERN,
  MICROSERVICE_FIND_ALL_RESOURCE_AVAILABILITY_PATTERN,
  MICROSERVICE_FIND_ONE_RESOURCE_AVAILABILITY_PATTERN,
  MICROSERVICE_UPDATE_RESOURCE_AVAILABILITY_PATTERN,
  MICROSERVICE_REMOVE_RESOURCE_AVAILABILITY_PATTERN,
} from '../constants';

@Controller('resource-availability')
@UseFilters(AppRpcExceptionsFilter)
export class ResourceAvailabilityController {
  constructor(
    private readonly resourceAvailabilityService: ResourceAvailabilityService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_RESOURCE_AVAILABILITY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateResourceAvailabilityDto,
  ) {
    return this.resourceAvailabilityService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_RESOURCE_AVAILABILITY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersResourceAvailabilityDto,
  ) {
    return this.resourceAvailabilityService.findAll(userId, filters);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_RESOURCE_AVAILABILITY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { availabilityId: number },
  ) {
    return this.resourceAvailabilityService.findOne(userId, dto.availabilityId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_RESOURCE_AVAILABILITY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    dto: { availabilityId: number } & UpdateResourceAvailabilityDto,
  ) {
    const { availabilityId, ...payload } = dto;
    return this.resourceAvailabilityService.update(
      userId,
      availabilityId,
      payload,
    );
  }

  @MessagePattern(MICROSERVICE_REMOVE_RESOURCE_AVAILABILITY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { availabilityId: number },
  ) {
    return this.resourceAvailabilityService.remove(userId, dto.availabilityId);
  }
}
