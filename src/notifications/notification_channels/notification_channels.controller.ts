import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationChannelsService } from './notification_channels.service';
import { CreateNotificationChannelDto } from './dto/create-notification_channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification_channel.dto';
import { FiltersDto } from './dto/filters.dto';
import { NotificationChannelEntity } from './entities/notification_channel.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_NOTIFICATION_CHANNEL_PATTERN,
  MICROSERVICE_FIND_ALL_NOTIFICATION_CHANNEL_PATTERN,
  MICROSERVICE_FIND_ONE_NOTIFICATION_CHANNEL_PATTERN,
  MICROSERVICE_UPDATE_NOTIFICATION_CHANNEL_PATTERN,
  MICROSERVICE_REMOVE_NOTIFICATION_CHANNEL_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('notification-channels')
export class NotificationChannelsController {
  constructor(
    private readonly notificationChannelsService: NotificationChannelsService,
  ) {}

  /**
   * Handles the creation of a new notification channel.
   * @param userId - ID of the user making the request.
   * @param createNotificationChannelDto - Data transfer object containing channel details.
   * @returns The created notification channel entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_CHANNEL_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createNotificationChannel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createNotificationChannelDto: CreateNotificationChannelDto,
  ): Promise<NotificationChannelEntity> {
    return this.notificationChannelsService.create(
      userId,
      createNotificationChannelDto,
    );
  }

  /**
   * Retrieves all notification channels based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying notification channels.
   * @returns A list of notification channels matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_CHANNEL_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllNotificationChannels(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.notificationChannelsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single notification channel by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification channel to retrieve.
   * @returns The notification channel entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_CHANNEL_PATTERN)
  findOneNotificationChannel(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<NotificationChannelEntity | NotFoundException> {
    return this.notificationChannelsService.findOne(userId, id);
  }

  /**
   * Updates an existing notification channel.
   * @param userId - ID of the user making the request.
   * @param updateNotificationChannelDto - Data transfer object containing updated channel details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_CHANNEL_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateNotificationChannel(
    @Payload('userId') userId: number,
    @Payload('data') updateNotificationChannelDto: UpdateNotificationChannelDto,
  ): Promise<UpdateResult> {
    return this.notificationChannelsService.update(
      userId,
      updateNotificationChannelDto.channelId,
      updateNotificationChannelDto,
    );
  }

  /**
   * Deletes a notification channel by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification channel to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_CHANNEL_PATTERN)
  removeNotificationChannel(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.notificationChannelsService.remove(userId, id);
  }
}
