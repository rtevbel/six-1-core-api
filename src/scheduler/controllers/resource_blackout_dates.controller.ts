import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { ResourceBlackoutDatesService } from '../services/resource_blackout_dates.service';
import { CreateResourceBlackoutDateDto } from '../dto/create-resource-blackout-date.dto';
import { FiltersResourceBlackoutDateDto } from '../dto/filters-resource-blackout-date.dto';
import { UpdateResourceBlackoutDateDto } from '../dto/update-resource-blackout-date.dto';
import {
  MICROSERVICE_CREATE_RESOURCE_BLACKOUT_PATTERN,
  MICROSERVICE_FIND_ALL_RESOURCE_BLACKOUT_PATTERN,
  MICROSERVICE_FIND_ONE_RESOURCE_BLACKOUT_PATTERN,
  MICROSERVICE_UPDATE_RESOURCE_BLACKOUT_PATTERN,
  MICROSERVICE_REMOVE_RESOURCE_BLACKOUT_PATTERN,
} from '../constants';

@Controller('resource-blackout-dates')
@UseFilters(AppRpcExceptionsFilter)
export class ResourceBlackoutDatesController {
  constructor(
    private readonly resourceBlackoutDatesService: ResourceBlackoutDatesService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_RESOURCE_BLACKOUT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateResourceBlackoutDateDto,
  ) {
    return this.resourceBlackoutDatesService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_RESOURCE_BLACKOUT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersResourceBlackoutDateDto,
  ) {
    return this.resourceBlackoutDatesService.findAll(userId, filters);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_RESOURCE_BLACKOUT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { blackoutId: number },
  ) {
    return this.resourceBlackoutDatesService.findOne(userId, dto.blackoutId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_RESOURCE_BLACKOUT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    dto: { blackoutId: number } & UpdateResourceBlackoutDateDto,
  ) {
    const { blackoutId, ...payload } = dto;
    return this.resourceBlackoutDatesService.update(
      userId,
      blackoutId,
      payload,
    );
  }

  @MessagePattern(MICROSERVICE_REMOVE_RESOURCE_BLACKOUT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { blackoutId: number },
  ) {
    return this.resourceBlackoutDatesService.remove(userId, dto.blackoutId);
  }
}
