import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { NotificationTemplateBindingService } from './services/notification-template-binding.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FiltersDto } from './dto/filters.dto';
import { NotificationEntity } from './entities/notification.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { BindNotificationTemplateDto } from './dto/bind-notification-template.dto';

import {
  MICROSERVICE_CREATE_NOTIFICATION_PATTERN,
  MICROSERVICE_FIND_ALL_NOTIFICATION_PATTERN,
  MICROSERVICE_FIND_ONE_NOTIFICATION_PATTERN,
  MICROSERVICE_UPDATE_NOTIFICATION_PATTERN,
  MICROSERVICE_REMOVE_NOTIFICATION_PATTERN,
  MICROSERVICE_BIND_NOTIFICATION_TEMPLATE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationTemplateBindingService: NotificationTemplateBindingService,
  ) {}

  /**
   * Handles the creation of a new notification.
   * @param userId - ID of the user making the request.
   * @param createNotificationDto - Data transfer object containing notification details.
   * @returns The created notification entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createNotification(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    return this.notificationsService.create(userId, createNotificationDto);
  }

  /**
   * Retrieves all notifications based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying notifications.
   * @returns A list of notifications matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllNotifications(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.notificationsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single notification by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification to retrieve.
   * @returns The notification entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_PATTERN)
  findOneNotification(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<NotificationEntity | NotFoundException> {
    return this.notificationsService.findOne(userId, id);
  }

  /**
   * Updates an existing notification.
   * @param userId - ID of the user making the request.
   * @param updateNotificationDto - Data transfer object containing updated notification details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateNotification(
    @Payload('userId') userId: number,
    @Payload('data') updateNotificationDto: UpdateNotificationDto,
  ): Promise<UpdateResult> {
    return this.notificationsService.update(
      userId,
      updateNotificationDto.notificationId,
      updateNotificationDto,
    );
  }

  /**
   * Deletes a notification by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_PATTERN)
  removeNotification(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.notificationsService.remove(userId, id);
  }

  /**
   * Binds a template to an event and channel.
   * @param userId - ID of the user making the request.
   * @param bindDto - Binding details for event, channel, and template.
   * @returns Binding metadata.
   */
  @MessagePattern(MICROSERVICE_BIND_NOTIFICATION_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  bindNotificationTemplate(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') bindDto: BindNotificationTemplateDto,
  ): Promise<{
    eventId: number;
    channelId: number;
    templateId: number;
    listenerId: number;
  }> {
    return this.notificationTemplateBindingService.bindTemplate(userId, bindDto);
  }

  /**
   * Scheduled task to process event logs and create notifications every 10 minutes.
   * This method is triggered by a cron job.
   */
  //@Cron(CronExpression.EVERY_10_SECONDS)
  processEventLogsAndCreateNotifications(): Promise<void> {
    return this.notificationsService.processEventLogsAndCreateNotifications();
  }
}
