import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationLogsService } from './notification_logs.service';
import { CreateNotificationLogDto } from './dto/create-notification_log.dto';
import { UpdateNotificationLogDto } from './dto/update-notification_log.dto';
import { FiltersDto } from './dto/filters.dto';
import { NotificationLogEntity } from './entities/notification_log.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_NOTIFICATION_LOG_PATTERN,
  MICROSERVICE_FIND_ALL_NOTIFICATION_LOG_PATTERN,
  MICROSERVICE_FIND_ONE_NOTIFICATION_LOG_PATTERN,
  MICROSERVICE_UPDATE_NOTIFICATION_LOG_PATTERN,
  MICROSERVICE_REMOVE_NOTIFICATION_LOG_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('notification-logs')
export class NotificationLogsController {
  constructor(
    private readonly notificationLogsService: NotificationLogsService,
  ) {}

  /**
   * Handles the creation of a new notification log.
   * @param userId - ID of the user making the request.
   * @param createNotificationLogDto - Data transfer object containing notification log details.
   * @returns The created notification log entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createNotificationLog(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createNotificationLogDto: CreateNotificationLogDto,
  ): Promise<NotificationLogEntity> {
    return this.notificationLogsService.create(userId, createNotificationLogDto);
  }

  /**
   * Retrieves all notification logs based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying notification logs.
   * @returns A list of notification logs matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllNotificationLogs(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.notificationLogsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single notification log by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification log to retrieve.
   * @returns The notification log entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_LOG_PATTERN)
  findOneNotificationLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<NotificationLogEntity | NotFoundException> {
    return this.notificationLogsService.findOne(userId, id);
  }

  /**
   * Updates an existing notification log.
   * @param userId - ID of the user making the request.
   * @param updateNotificationLogDto - Data transfer object containing updated notification log details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateNotificationLog(
    @Payload('userId') userId: number,
    @Payload('data') updateNotificationLogDto: UpdateNotificationLogDto,
  ): Promise<UpdateResult> {
    return this.notificationLogsService.update(
      userId,
      updateNotificationLogDto.logId,
      updateNotificationLogDto,
    );
  }

  /**
   * Deletes a notification log by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification log to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_LOG_PATTERN)
  removeNotificationLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.notificationLogsService.remove(userId, id);
  }
}