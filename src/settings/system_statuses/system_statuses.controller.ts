import {
  Controller,
  NotFoundException,
  ParseFloatPipe,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SystemStatusesService } from './system_statuses.service';
import { CreateSystemStatusDto } from './dto/create-system-status.dto';
import { UpdateSystemStatusDto } from './dto/update-system-status.dto';
import { FiltersDto } from './dto/filters.dto';
import { SystemStatusEntity } from './entities/system-status.entity';
import { FindAllResultInterface as FindAllStatusResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_STATUSES_PATTERN,
  MICROSERVICE_FIND_ALL_STATUSESS_PATTERN,
  MICROSERVICE_FIND_ONE_STATUSES_PATTERN,
  MICROSERVICE_UPDATE_STATUSES_PATTERN,
  MICROSERVICE_REMOVE_STATUSES_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from 'src/common/pipes/app-rpc-validation.pipe';

@Controller('system_statuses')
export class SystemStatusesController {
  constructor(private readonly systemStatusesService: SystemStatusesService) {}

  /**
   * Handles the creation of a new system status.
   * @param userId - ID of the user making the request.
   * @param createSystemStatusDto - Data transfer object containing status details.
   * @returns The created system status entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_STATUSES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createStatus(
    @Payload('userId', ParseFloatPipe) userId: number,
    @Payload('data') createSystemStatusDto: CreateSystemStatusDto,
  ): Promise<SystemStatusEntity> {
    return this.systemStatusesService.create(userId, createSystemStatusDto);
  }

  /**
   * Retrieves all system statuses based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying statuses.
   * @returns A list of system statuses matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_STATUSESS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllStatuses(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllStatusResultInterface | never> {
    return this.systemStatusesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single system status by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the status to retrieve.
   * @returns The system status entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_STATUSES_PATTERN)
  findOneStatus(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<SystemStatusEntity | NotFoundException> {
    return this.systemStatusesService.findOne(userId, id);
  }

  /**
   * Updates an existing system status.
   * @param userId - ID of the user making the request.
   * @param updateSystemStatusDto - Data transfer object containing updated status details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_STATUSES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateStatus(
    @Payload('userId') userId: number,
    @Payload('data') updateSystemStatusDto: UpdateSystemStatusDto,
  ): Promise<UpdateResult> {
    return this.systemStatusesService.update(
      userId,
      updateSystemStatusDto.status_id,
      updateSystemStatusDto,
    );
  }

  /**
   * Deletes a system status by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the status to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_STATUSES_PATTERN)
  removeStatus(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.systemStatusesService.remove(userId, id);
  }
}
