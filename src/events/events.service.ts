import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import {
  Repository,
  Like,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventEnvelope,
  buildEventEnvelope,
  normalizeEntityRef,
} from './types';
import type { EventEmitOptions } from './interfaces/event-emit-options.interface';
import { EventLogsService } from './event_logs/event_logs.service';
import { CreateEventLogsDto } from './event_logs/dto/create-event_logs.dto';
import { PlatformEventFlagsService } from './config/platform-event-flags.service';
import { PlatformEventBusService } from './platform-bus/platform-event-bus.service';
import { validatePlatformEventEnvelope } from './validation/event-envelope.validation';
import { EventEnvelopeValidationError } from './validation/event-envelope-validation.error';
import { getDeprecatedEventEmitWarning } from './platform-event-naming.util';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

/**
 * Domain event emission and catalog CRUD.
 *
 * **Producer contract:** all feature modules emit via this service — not `EventEmitter2` directly.
 * @see docs/platform-event-catalog.md — naming, catalog, checklist
 * @see docs/platform-event-envelope.md — envelope shape & validation
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly emitter: EventEmitter2,
    @Inject(forwardRef(() => EventLogsService))
    private readonly eventLogsService: EventLogsService,
    private readonly platformEventFlags: PlatformEventFlagsService,
    @Inject(forwardRef(() => PlatformEventBusService))
    private readonly platformEventBus: PlatformEventBusService,
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

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: events,
      eventRecords: events,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
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
    return await this.eventRepository.update(
      id,
      updateEventDto as QueryDeepPartialEntity<EventEntity>,
    );
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
    const event = await this.findOptionalByName(name);

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }

    return event;
  }

  /**
   * Retrieves a catalog row by name, or null when not registered.
   */
  async findOptionalByName(name: string): Promise<EventEntity | null> {
    return this.eventRepository.findOne({ where: { name } });
  }

  /**
   * Retrieves a single event id by name.
   * @param userId - ID of the user requesting the data.
   * @param name - Name of the event to retrieve.
   * @returns event id
   * @throws RpcException if no record is found.
   */
  async findIdByName(userId: number, name: string): Promise<number | null> {
    const event = await this.findOptionalByName(name);

    if (!event) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', EventEntity.name),
      );
    }
    return event.eventId;
  }

  /**
   * Retrieves an event id by name without throwing when absent.
   */
  async findIdByNameOrNull(name: string): Promise<number | null> {
    const event = await this.findOptionalByName(name);
    return event?.eventId ?? null;
  }

  /**
   * Emits a domain event asynchronously and awaits listener completion.
   *
   * Use {@link PLATFORM_EVENT_NAMES} for canonical names.
   * @see docs/platform-event-catalog.md
   * @see docs/platform-event-envelope.md
   */
  async emitAsync<TData = unknown>(
    eventName: string,
    opts: EventEmitOptions<TData> = {},
  ): Promise<any> {
    const envelope = this.prepareEnvelope(eventName, opts);
    return this.dispatchEnvelope(eventName, envelope);
  }

  /**
   * Emits a domain event (fire-and-forget).
   *
   * Use {@link PLATFORM_EVENT_NAMES} for canonical names.
   * @see docs/platform-event-catalog.md
   * @see docs/platform-event-envelope.md
   */
  emit<TData = unknown>(
    eventName: string,
    opts: EventEmitOptions<TData> = {},
  ): void {
    const envelope = this.prepareEnvelope(eventName, opts);
    void this.dispatchEnvelope(eventName, envelope).catch((error) => {
      this.logger.error(
        `Failed to dispatch event ${eventName}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  /**
   * Emits a domain event and optionally creates `event_logs` for explicit recipients.
   *
   * @see docs/platform-event-catalog.md — when to use vs notification bridge
   */
  async emitWithLogs<TData = Record<string, unknown>>(
    eventName: string,
    opts: EventEmitOptions<TData> & {
      actorId: number;
      recipientIds?: number[];
    },
  ): Promise<void> {
    const envelope = this.prepareEnvelope(eventName, {
      ...opts,
      userId: opts.actorId,
      createdBy: opts.actorId,
    });

    await this.dispatchEnvelope(eventName, envelope);

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

  private async dispatchEnvelope(
    eventName: string,
    envelope: EventEnvelope,
  ): Promise<unknown> {
    if (this.platformEventFlags.isEventBusEnabled()) {
      await this.platformEventBus.publish(envelope);
      return undefined;
    }
    return this.emitter.emitAsync(eventName, envelope);
  }

  private prepareEnvelope<TData>(
    eventName: string,
    opts: EventEmitOptions<TData>,
  ): EventEnvelope<TData> {
    this.warnDeprecatedEventName(eventName);
    const envelope = buildEventEnvelope(eventName, opts);
    this.applyEnvelopeValidation(envelope);
    return envelope;
  }

  private warnDeprecatedEventName(eventName: string): void {
    const warning = getDeprecatedEventEmitWarning(eventName);
    if (warning) {
      this.logger.warn(warning.message);
    }
  }

  private applyEnvelopeValidation(envelope: EventEnvelope): void {
    const mode = this.platformEventFlags.getEnvelopeValidationMode();
    if (mode === 'off') {
      return;
    }

    const result = validatePlatformEventEnvelope(envelope);

    if (mode === 'strict') {
      const issues = [...result.errors, ...result.warnings];
      if (issues.length > 0) {
        throw new EventEnvelopeValidationError(envelope.eventName, issues);
      }
      return;
    }

    const issues = [...result.errors, ...result.warnings];
    if (issues.length === 0) {
      return;
    }

    this.logger.warn(
      `Platform event envelope validation (${envelope.eventName}): ${issues.join('; ')}`,
    );
  }
}
