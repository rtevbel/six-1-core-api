import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { SharingLogsService } from '../services/sharing_logs.service';
import { CreateSharingLogDto } from '../dto/sharing-logs/create-sharing-log.dto';
import { FiltersSharingLogDto } from '../dto/sharing-logs/filters-sharing-log.dto';
import { UpdateSharingLogDto } from '../dto/sharing-logs/update-sharing-log.dto';
import {
  MICROSERVICE_CREATE_SHARING_LOG_PATTERN,
  MICROSERVICE_FIND_ALL_SHARING_LOGS_PATTERN,
  MICROSERVICE_FIND_ONE_SHARING_LOG_PATTERN,
  MICROSERVICE_UPDATE_SHARING_LOG_PATTERN,
  MICROSERVICE_REMOVE_SHARING_LOG_PATTERN,
} from '../constants';

/**
 * Controller responsible for handling RPC operations for sharing logs.
 *
 * Aligned with the events controller pattern:
 *  - Uses message patterns for all endpoints.
 *  - Extracts `userId` from the RPC payload.
 *  - Applies `AppRpcValidationPipe` for DTO validation.
 */
@Controller('sharing-logs')
@UseFilters(AppRpcExceptionsFilter)
export class SharingLogsController {
  constructor(private readonly sharingLogsService: SharingLogsService) {}

  /**
   * Creates a new sharing log record.
   * @param userId - ID of the user making the request.
   * @param dto - DTO describing the log entry to create.
   * @returns The created sharing log entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_SHARING_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSharingLogDto,
  ) {
    return this.sharingLogsService.create(userId, dto);
  }

  /**
   * Retrieves sharing logs using the provided filters.
   * @param userId - ID of the user making the request.
   * @param filters - Filters for pagination, sorting and narrowing the results.
   * @returns A list of sharing logs and pagination metadata.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SHARING_LOGS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersSharingLogDto,
  ) {
    return this.sharingLogsService.findAll(userId, filters);
  }

  /**
   * Retrieves a single sharing log by ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `logId` to fetch.
   * @returns The sharing log entity if found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SHARING_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { logId: number },
  ) {
    return this.sharingLogsService.findOne(userId, dto.logId);
  }

  /**
   * Updates an existing sharing log record.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing `logId` and the update payload.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SHARING_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { logId: number } & UpdateSharingLogDto,
  ) {
    const { logId, ...payload } = dto;
    return this.sharingLogsService.update(userId, logId, payload);
  }

  /**
   * Deletes a sharing log by ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `logId` to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SHARING_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { logId: number },
  ) {
    return this.sharingLogsService.remove(userId, dto.logId);
  }
}
