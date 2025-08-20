import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventLogEntity } from './entities/event_log.entity';
import { CreateEventLogDto } from './dto/create-event_log.dto';
import { UpdateEventLogDto } from './dto/update-event_log.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class EventLogsService {
  constructor(
    @InjectRepository(EventLogEntity)
    private readonly eventLogRepository: Repository<EventLogEntity>,
  ) {}

  /**
   * Creates a new event log record.
   * @param userId - ID of the user creating the record.
   * @param createEventLogDto - Data Transfer Object containing event log details.
   * @returns The created EventLogEntity.
   */
  async create(userId: number, createEventLogDto: CreateEventLogDto): Promise<EventLogEntity> {
    createEventLogDto.createdBy = userId;

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
  async findAll(userId: number, filtersDto: FiltersDto): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [eventLogs, total] = await this.eventLogRepository.findAndCount(findQuery);

    if (eventLogs.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventLogEntity.name,
        ),
      );
    }

    return {
      eventLogRecords: eventLogs,
      pagination: this.buildPagination(filtersDto, total),
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
    const eventLog = await this.eventLogRepository.findOneByOrFail({ logId: id });

    if (!eventLog) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventLogEntity.name),
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
    const eventLog = await this.eventLogRepository.findOneByOrFail({ logId: id });

    if (!eventLog) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventLogEntity.name),
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

    if (filtersDto.search) {
        query.where = {
          event: {
            name: Like(`%${filtersDto.search}%`),
          }
      }
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

}