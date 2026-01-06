import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { SharedTasksService } from '../services/shared_tasks.service';
import { CreateSharedTaskDto } from '../dto/shared-tasks/create-shared-task.dto';
import { FiltersSharedTaskDto } from '../dto/shared-tasks/filters-shared-task.dto';
import { UpdateSharedTaskDto } from '../dto/shared-tasks/update-shared-task.dto';
import {
  MICROSERVICE_CREATE_SHARED_TASK_PATTERN,
  MICROSERVICE_FIND_ALL_SHARED_TASKS_PATTERN,
  MICROSERVICE_FIND_ONE_SHARED_TASK_PATTERN,
  MICROSERVICE_UPDATE_SHARED_TASK_PATTERN,
  MICROSERVICE_REMOVE_SHARED_TASK_PATTERN,
} from '../constants';

/**
 * Controller responsible for handling RPC operations for shared tasks.
 *
 * Uses the same style as the events controller module:
 *  - Handlers are exposed via message patterns.
 *  - `userId` is read from the payload and forwarded to the service.
 *  - DTO validation is applied by `AppRpcValidationPipe`.
 */
@Controller('shared-tasks')
@UseFilters(AppRpcExceptionsFilter)
export class SharedTasksController {
  constructor(private readonly sharedTasksService: SharedTasksService) {}

  /**
   * Creates a new shared task entry.
   * @param userId - ID of the user making the request.
   * @param dto - DTO describing how the task is shared.
   * @returns The created shared task entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_SHARED_TASK_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSharedTaskDto,
  ) {
    return this.sharedTasksService.create(userId, dto);
  }

  /**
   * Retrieves shared tasks based on the given filters.
   * @param userId - ID of the user making the request.
   * @param filters - Filters for pagination, sorting and narrowing the results.
   * @returns A list of shared tasks and pagination details.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SHARED_TASKS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersSharedTaskDto,
  ) {
    return this.sharedTasksService.findAll(userId, filters);
  }

  /**
   * Retrieves a single shared task by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` of the record to fetch.
   * @returns The shared task entity if found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SHARED_TASK_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedTasksService.findOne(userId, dto.sharingId);
  }

  /**
   * Updates an existing shared task record.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing `sharingId` and the update payload.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SHARED_TASK_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number } & UpdateSharedTaskDto,
  ) {
    const { sharingId, ...payload } = dto;
    return this.sharedTasksService.update(userId, sharingId, payload);
  }

  /**
   * Deletes a shared task by its sharing ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `sharingId` to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SHARED_TASK_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { sharingId: number },
  ) {
    return this.sharedTasksService.remove(userId, dto.sharingId);
  }
}
