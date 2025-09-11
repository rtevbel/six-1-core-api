import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { EventLogsService } from '../events/event_logs/event_logs.service';
import { EventListenersService } from '../events/event_listeners/event_listeners.service';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly eventLogsService: EventLogsService,
    private readonly eventListenersService: EventListenersService,
  ) {}

  /**
   * Creates a new notification record.
   * @param userId - ID of the user creating the record.
   * @param createNotificationDto - Data Transfer Object containing notification details.
   * @returns The created NotificationEntity.
   */
  async create(
    userId: number,
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    createNotificationDto.userId = userId;

    return await this.notificationRepository.save(
      this.notificationRepository.create(createNotificationDto),
    );
  }

  /**
   * Retrieves all notifications with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of notifications and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [notifications, total] =
      await this.notificationRepository.findAndCount(findQuery);

    if (notifications.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          NotificationEntity.name,
        ),
      );
    }

    return {
      notificationRecords: notifications,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single notification by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the notification to retrieve.
   * @returns The NotificationEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOneByOrFail({
      notificationId: id,
      userId,
    });

    if (!notification) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationEntity.name,
        ),
      );
    }

    return notification;
  }

  /**
   * Updates an existing notification record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the notification to update.
   * @param updateNotificationDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<UpdateResult> {
    const notification = await this.notificationRepository.findOneByOrFail({
      notificationId: id,
      userId,
    });

    if (!notification) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationEntity.name,
        ),
      );
    }

    return await this.notificationRepository.update(id, updateNotificationDto);
  }

  /**
   * Deletes a notification record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the notification to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.notificationRepository.delete({
      notificationId: id,
      userId,
    });
  }

  /**
   * Builds a query object for finding notifications based on filters.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { message: Like(`%${filtersDto.search}%`) },
        { subject: Like(`%${filtersDto.search}%`) },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds pagination details for the response.
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records found.
   * @returns An object containing total records, current page, and limit.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }


  /**
   * Processes event logs and creates notifications for users based on their event listeners.
   * This method fetches event logs, retrieves associated listeners, and generates notifications accordingly.
   */

  async processEventLogsAndCreateNotifications(): Promise<void> {

    // Step 1: Fetch all event logs
    const eventLogs = await this.eventLogsService.getAllEventLogs();

    // Proceed only if there are event logs to process
    if(eventLogs.length > 0){

      for (const eventLog of eventLogs) {
        //const { id: eventId, eventName, data } = eventLog;
        let eventName:string = eventLog.event.name;
        let eventId:number = eventLog.event.eventId;
        let userId:number = eventLog.userId;
  
        // Step 2: Fetch listeners for the current event
        const listeners = await this.eventListenersService.getListenersByEventId(eventId);
  
        for (const listener of listeners) {
          //const { userId, notificationType } = ;
          let notificationType:string = listener.channel.name;
          let subject = listener.template ? listener.template.subject : `Notification for event: ${eventName}`;
          let message = listener.template ? listener.template.message : `Event ${eventName} occurred with data: ${JSON.stringify(eventLog.entityType)}`;
          
          // Step 3: Create a notification DTO for each listener
          const createNotificationDto = plainToInstance(CreateNotificationDto, {
            userId,
            eventId,
            type: notificationType,
            subject: subject ? subject : `Notification for event: ${eventName}`,
            message: message ? message :`Event ${eventName} occurred with data: ${JSON.stringify(eventLog.entityType)}`,
            status: 'pending',
            scheduledAt: null, // Optional: Add scheduling logic if needed
          });
  
          // Step 4: Save the notification to the database
          await this.create(userId,createNotificationDto);
          
          // Step 5: Update the event log status to indicate notification has been processed
          await this.eventLogsService.update(userId , eventLog.logId,{logId:eventLog.logId,status:1});
        }
      }

    }

  }



}
