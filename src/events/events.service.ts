import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEnvelope, EntityRef, normalizeEntityRef } from './types';
import { EventLogsService } from './event_logs/event_logs.service';
import { CreateEventLogsDto } from './event_logs/dto/create-event_logs.dto';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly emitter: EventEmitter2,
    @Inject(forwardRef(() => EventLogsService))
    private readonly eventLogsService: EventLogsService,
  ) {}

  /**
   * Creates a new event record.
   * @param userId - ID of the user creating the record.
   * @param createEventDto - Data Transfer Object containing event details.
   * @returns The created EventEntity.
   */
  async create(
    userId: number,
    createEventDto: CreateEventDto,
  ): Promise<EventEntity> {
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
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
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

  /**
   * Retrieves a single event by name.
   * @param userId - ID of the user requesting the data.
   * @param name - Name of the event to retrieve.
   * @returns The EventEntity matching the name.
   * @throws RpcException if no record is found.
   */
  async findOneByName(userId: number, name: string): Promise<EventEntity> {
    const event = await this.eventRepository.findOne({ where: { name } });

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }

    return event;
  }

  /**
   * Retrieves a single event id by name.
   * @param userId - ID of the user requesting the data.
   * @param name - Name of the event to retrieve.
   * @returns  event id
   * @throws RpcException if no record is found.
   */
  async findIdByName(userId: number, name: string): Promise<number | null> {
    const event = await this.eventRepository.findOne({ where: { name } });

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }
    return event.eventId;
  }

  /**
   * Emits a domain event with the specified name and options.
   *
   * @param eventName - The name of the event to emit.
   * @param opts - Additional options for the event, including:
   *   - entity: The entity associated with the event (can be an object or EntityRef).
   *   - userId: The ID of the user responsible for the event.
   *   - createdBy: The ID of the user who created the event (defaults to userId if not provided).
   *   - data: The payload or data associated with the event.
   *   - correlationId: An ID to correlate this event with other events.
   *   - causationId: An ID to indicate the cause of this event.
   *   - externalId: An external identifier for the event.
   *   - tenantId: The tenant ID associated with the event.
   *   - occurredAt: The timestamp when the event occurred (defaults to the current date/time).
   */
  async emitAsync<TData = unknown>(
    eventName: string,
    opts: {
      entity?: object | EntityRef;
      userId?: number;
      createdBy?: number;
      data?: TData;
      correlationId?: string;
      causationId?: string;
      externalId?: string;
      tenantId?: number | string;
      occurredAt?: Date;
    } = {},
  ): Promise<any> {
    // Create an EventEnvelope object with the provided options and defaults
    const envelope: EventEnvelope<TData> = {
      eventName,
      userId: opts.userId,
      createdBy: opts.createdBy ?? opts.userId,
      entity: normalizeEntityRef(opts.entity),
      data: opts.data,
      correlationId: opts.correlationId,
      causationId: opts.causationId,
      externalId: opts.externalId,
      tenantId: opts.tenantId,
      occurredAt: opts.occurredAt ?? new Date(),
    };
    // Emit the event using the EventEmitter2 instance
    return await this.emitter.emitAsync(eventName, envelope);
  }

  /**
   * Emits a domain event with the specified name and options.
   *
   * @param eventName - The name of the event to emit.
   * @param opts - Additional options for the event, including:
   *   - entity: The entity associated with the event (can be an object or EntityRef).
   *   - userId: The ID of the user responsible for the event.
   *   - createdBy: The ID of the user who created the event (defaults to userId if not provided).
   *   - data: The payload or data associated with the event.
   *   - correlationId: An ID to correlate this event with other events.
   *   - causationId: An ID to indicate the cause of this event.
   *   - externalId: An external identifier for the event.
   *   - tenantId: The tenant ID associated with the event.
   *   - occurredAt: The timestamp when the event occurred (defaults to the current date/time).
   */
  emit<TData = unknown>(
    eventName: string,
    opts: {
      entity?: object | EntityRef;
      userId?: number;
      createdBy?: number;
      data?: TData;
      correlationId?: string;
      causationId?: string;
      externalId?: string;
      tenantId?: number | string;
      occurredAt?: Date;
    } = {},
  ): void {
    // Create an EventEnvelope object with the provided options and defaults
    const envelope: EventEnvelope<TData> = {
      eventName,
      userId: opts.userId,
      createdBy: opts.createdBy ?? opts.userId,
      entity: normalizeEntityRef(opts.entity),
      data: opts.data,
      correlationId: opts.correlationId,
      causationId: opts.causationId,
      externalId: opts.externalId,
      tenantId: opts.tenantId,
      occurredAt: opts.occurredAt ?? new Date(),
    };

    // Emit the event using the EventEmitter2 instance
    this.emitter.emit(eventName, envelope);
  }

  /**
   * Emits a domain event and optionally creates event logs for recipients.
   *
   * @param eventName - The name of the event to emit.
   * @param opts - Additional options for the event and log creation.
   */
  async emitWithLogs<TData = Record<string, unknown>>(
    eventName: string,
    opts: {
      actorId: number;
      recipientIds?: number[];
      entity?: object | EntityRef;
      data?: TData;
      correlationId?: string;
      causationId?: string;
      externalId?: string;
      tenantId?: number | string;
      occurredAt?: Date;
    },
  ): Promise<void> {
    const envelope: EventEnvelope<TData> = {
      eventName,
      userId: opts.actorId,
      createdBy: opts.actorId,
      entity: normalizeEntityRef(opts.entity),
      data: opts.data,
      correlationId: opts.correlationId,
      causationId: opts.causationId,
      externalId: opts.externalId,
      tenantId: opts.tenantId,
      occurredAt: opts.occurredAt ?? new Date(),
    };

    await this.emitter.emitAsync(eventName, envelope);

    if (opts.recipientIds && opts.recipientIds.length > 0) {
      const entityRef = normalizeEntityRef(opts.entity);
      const entityId =
        entityRef?.entityId != null && !Number.isNaN(Number(entityRef.entityId))
          ? Number(entityRef.entityId)
          : undefined;

      const createEventLogsDto: CreateEventLogsDto = {
        eventId: undefined,
        userIds: opts.recipientIds,
        entityId,
        entityType: entityRef?.entityType ?? undefined,
        externalId: opts.externalId ?? undefined,
        payload: opts.data ? (opts.data as object) : undefined,
        createdBy: opts.actorId,
      };

      await this.eventLogsService.createEventLogByEventName(
        opts.actorId,
        eventName,
        createEventLogsDto,
      );
    }
  }
}
