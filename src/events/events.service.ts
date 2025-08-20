import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  /**
   * Creates a new event record.
   * @param userId - ID of the user creating the record.
   * @param createEventDto - Data Transfer Object containing event details.
   * @returns The created EventEntity.
   */
  async create(userId: number, createEventDto: CreateEventDto): Promise<EventEntity> {
    createEventDto.createdBy = userId;

    return await this.eventRepository.save(
      this.eventRepository.create(createEventDto),
    );
  }

  /**
   * Retrieves all events with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of events and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(userId: number, filtersDto: FiltersDto): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [events, total] = await this.eventRepository.findAndCount(findQuery);

    if (events.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventEntity.name,
        ),
      );
    }

    return {
      eventRecords: events,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds the query object for finding events based on filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
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
   * Retrieves a single event by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the event to retrieve.
   * @returns The EventEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<EventEntity> {
    const event = await this.eventRepository.findOneByOrFail({ eventId: id });

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }

    return event;
  }

  /**
   * Updates an existing event record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the event to update.
   * @param updateEventDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateEventDto: UpdateEventDto,
  ): Promise<UpdateResult> {
    const event = await this.eventRepository.findOneByOrFail({ eventId: id });

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }

    updateEventDto.updatedBy = userId;
    return await this.eventRepository.update(id, updateEventDto);
  }

  /**
   * Deletes an event record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the event to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.eventRepository.delete({ eventId: id });
  }
}