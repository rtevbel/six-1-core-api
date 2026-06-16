import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventLogEntity } from './entities/event_log.entity';
import { CreateEventLogDto } from './dto/create-event_log.dto';
import { CreateEventLogsDto } from './dto/create-event_logs.dto';
import { UpdateEventLogDto } from './dto/update-event_log.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from '../events.service';
import { plainToInstance } from 'class-transformer';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class EventLogsService {
  constructor(
    @InjectRepository(EventLogEntity)
    private readonly eventLogRepository: Repository<EventLogEntity>,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Creates a new event log record.
   * @param userId - ID of the user creating the record.
   * @param createEventLogDto - Data Transfer Object containing event log details.
   * @param  extraPayload - Extra optional payload
   * @returns The created EventLogEntity.
   */
  async create(
    userId: number,
    createEventLogDto: CreateEventLogDto,
    extraPayload?: any,
  ): Promise<EventLogEntity> {
    if (extraPayload) {
      createEventLogDto.payload = extraPayload;
    }

    return await this.eventLogRepository.save(
      this.eventLogRepository.create(createEventLogDto),
    );
  }

  /**
   * Retrieves all event logs with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of event logs and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [eventLogs, total] =
      await this.eventLogRepository.findAndCount(findQuery);

    if (eventLogs.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventLogEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: eventLogs,
      eventLogRecords: eventLogs,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single event log by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the event log to retrieve.
   * @returns The EventLogEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<EventLogEntity> {
    const eventLog = await this.eventLogRepository.findOneByOrFail({
      logId: id,
    });

    if (!eventLog) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          EventLogEntity.name,
        ),
      );
    }

    return eventLog;
  }

  /**
   * Updates an existing event log record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the event log to update.
   * @param updateEventLogDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateEventLogDto: UpdateEventLogDto,
  ): Promise<UpdateResult> {
    const eventLog = await this.eventLogRepository.findOneByOrFail({
      logId: id,
    });

    if (!eventLog) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          EventLogEntity.name,
        ),
      );
    }

    return await this.eventLogRepository.update(id, updateEventLogDto);
  }

  /**
   * Deletes an event log record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the event log to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.eventLogRepository.delete({ logId: id });
  }

  /**
   * Builds the query object for finding event logs based on filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = { eventId: filtersDto.eventId };
    query.relations = ['event', 'user'];

    if (filtersDto.search) {
      query.where = {
        event: {
          name: Like(`%${filtersDto.search}%`),
        },
      };
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
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }

  /**
   * Fetches event details by event name and creates new event log records for each user in the userIds array.
   * @param userId - ID of the user creating the record.
   * @param eventName - The name of the event triggering the log creation.
   * @param createEventLogDto - Data Transfer Object containing additional event log details.
   * @returns An array of created EventLogEntity objects.
   */
  async createEventLogByEventName(
    userId: number,
    eventName: string,
    createEventLogsDto: CreateEventLogsDto,
  ): Promise<EventLogEntity[]> {
    // Fetch event details by event name
    const eventDetails = await this.eventsService.findOneByName(
      userId,
      eventName,
    );

    if (!eventDetails) {
      throw new NotFoundException(`Event with name "${eventName}" not found.`);
    }

    // Ensure userIds array exists and is not empty
    if (
      !createEventLogsDto.userIds ||
      createEventLogsDto.userIds.length === 0
    ) {
      throw new Error('No user IDs provided in the CreateEventLogDto.');
    }

    const createdEventLogs: EventLogEntity[] = [];

    // Iterate over each userId in the userIds array
    for (const usrId of createEventLogsDto.userIds) {
      const eventLogData = plainToInstance(CreateEventLogDto, {
        eventId: eventDetails.eventId,
        userId: usrId,
        entityId: createEventLogsDto.entityId || null,
        entityType: createEventLogsDto.entityType || null,
        externalId: createEventLogsDto.externalId || null,
        payload: createEventLogsDto.payload || null,
        createdBy: userId || 0,
        status: 0, // 0 = active, 1 = processed
      });

      // Create and save the event log record
      const eventLogEntity = await this.create(userId, eventLogData);

      createdEventLogs.push(eventLogEntity);
    }

    return createdEventLogs;
  }

  /**
   * Loads an event log with relations for notification dispatch (P8).
   */
  async findByIdForDispatch(logId: number): Promise<EventLogEntity | null> {
    return this.eventLogRepository.findOne({
      where: { logId },
      relations: ['event', 'user'],
    });
  }

  /**
   * Retrieves all event logs without any filters.
   * @returns An array of all EventLogEntity records.
   */
  async getAllEventLogs(): Promise<EventLogEntity[]> {
    return await this.eventLogRepository.find({
      relations: ['event', 'user'],
      where: { status: 0 },
    });
  }
}
