import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventListenerEntity } from './entities/event_listener.entity';
import { CreateEventListenerDto } from './dto/create-event_listener.dto';
import { UpdateEventListenerDto } from './dto/update-event_listener.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class EventListenersService {
  constructor(
    @InjectRepository(EventListenerEntity)
    private readonly eventListenerRepository: Repository<EventListenerEntity>,
  ) {}

  /**
   * Creates a new event listener record.
   * @param userId - ID of the user creating the record.
   * @param createEventListenerDto - Data Transfer Object containing event listener details.
   * @returns The created EventListenerEntity.
   */
  async create(
    userId: number,
    createEventListenerDto: CreateEventListenerDto,
  ): Promise<EventListenerEntity> {
    createEventListenerDto.createdBy = userId;

    return await this.eventListenerRepository.save(
      this.eventListenerRepository.create(createEventListenerDto),
    );
  }

  /**
   * Retrieves all event listeners with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filters - Filters for search, sorting, and pagination.
   * @returns An array of EventListenerEntity records.
   * @throws RpcException if no records match the filters.
   */
  async findAll(userId: number, filtersDto: FiltersDto): Promise<FindAllResultInterface> {

    const query = this.buildFindQuery(filtersDto);

    const [eventListeners, total] = await this.eventListenerRepository.findAndCount(query);

    if (eventListeners.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventListenerEntity.name,
        ),
      );
    }

    return {
      eventListenerRecords: eventListeners,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single event listener by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the event listener to retrieve.
   * @returns The EventListenerEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId:number , id: number): Promise<EventListenerEntity> {
    const eventListener = await this.eventListenerRepository.findOneByOrFail({ listenerId: id });

    if (!eventListener) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventListenerEntity.name),
      );
    }

    return eventListener;
  }

  /**
   * Updates an existing event listener record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the event listener to update.
   * @param updateEventListenerDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateEventListenerDto: UpdateEventListenerDto,
  ): Promise<UpdateResult> {
    const eventListener = await this.eventListenerRepository.findOneByOrFail({ listenerId: id });

    if (!eventListener) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventListenerEntity.name),
      );
    }
    
    updateEventListenerDto.updatedBy = userId;
    return await this.eventListenerRepository.update(id, updateEventListenerDto);
  }

  /**
   * Deletes an event listener record by ID.
   * @param userId - ID of the user removing the record.
   * @param id - ID of the event listener to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.eventListenerRepository.delete({ listenerId: id });
  }

  /**
   * Builds the query object for finding event listeners based on filters.
   * @param FiltersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(filters: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // If an eventId is provided, filter by it.
    if(filters.eventId){
      query.where = { eventId: filters.eventId };
    }

    // If a search term is provided, filter by eventId, channelId, or templateId.
    if (filters.search) {
      query.where = [
        { eventId: filters.search },
        { channelId: filters.search },
        { templateId: filters.search },
      ];
    }

    // If sorting is specified, add it to the query.
    if (filters.sortBy) {
      query.order = {
        [filters.sortBy]: filters.sortOrder || 'ASC',
      };
    }

    if (filters.limit) {
      filters.page = filters.page || 1;
      filters.limit = Math.min(filters.limit, 10);

      query.take = filters.limit;
      query.skip = (filters.page - 1) * filters.limit;
    }

    return query;
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Filters for search, sorting, and pagination.
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