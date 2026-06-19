import { Injectable, Logger } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { EventListenerEntity } from './entities/event_listener.entity';
import { CreateEventListenerDto } from './dto/create-event_listener.dto';
import { UpdateEventListenerDto } from './dto/update-event_listener.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import { EventNotificationRulesService } from '../event_notification_rules/event_notification_rules.service';
import { EventEntity } from '../entities/event.entity';
import {
  EVENT_LISTENERS_DEPRECATED_MESSAGE,
  EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE,
} from './event-listeners-deprecation.constants';

@Injectable()
export class EventListenersService {
  private readonly logger = new Logger(EventListenersService.name);

  constructor(
    @InjectRepository(EventListenerEntity)
    private readonly eventListenerRepository: Repository<EventListenerEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly platformFlags: PlatformEventFlagsService,
    private readonly notificationRulesService: EventNotificationRulesService,
  ) {}

  /**
   * Creates a new event listener record.
   * @deprecated Use `event_notification_rules` instead.
   */
  async create(
    userId: number,
    createEventListenerDto: CreateEventListenerDto,
  ): Promise<EventListenerEntity> {
    this.assertWritesAllowed('create');
    return await this.eventListenerRepository.save(
      this.eventListenerRepository.create(createEventListenerDto),
    );
  }

  /**
   * Retrieves all event listeners with optional filters, pagination, and sorting.
   * When `includeNotificationRules` is true and `eventId` is set, also returns
   * equivalent `event_notification_rules` rows (read shim).
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const query = this.buildFindQuery(filtersDto);

    const [eventListeners, total] =
      await this.eventListenerRepository.findAndCount(query);

    const includeRules = filtersDto.includeNotificationRules !== false;
    const notificationRuleRecords =
      includeRules && filtersDto.eventId
        ? await this.loadNotificationRulesForEventId(filtersDto.eventId)
        : undefined;

    if (eventListeners.length === 0 && !notificationRuleRecords?.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventListenerEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: eventListeners,
      eventListenerRecords: eventListeners,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
      deprecated: true,
      deprecationMessage: EVENT_LISTENERS_DEPRECATED_MESSAGE,
      ...(notificationRuleRecords?.length
        ? { notificationRuleRecords }
        : {}),
    };
  }

  async findOne(
    userId: number,
    eventId: number,
    id: number,
  ): Promise<EventListenerEntity> {
    const eventListener = await this.eventListenerRepository.findOneByOrFail({
      listenerId: id,
      eventId,
    });

    if (!eventListener) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          EventListenerEntity.name,
        ),
      );
    }

    return eventListener;
  }

  /**
   * Updates an existing event listener record.
   * @deprecated Use `event_notification_rules` instead.
   */
  async update(
    userId: number,
    id: number,
    updateEventListenerDto: UpdateEventListenerDto,
  ): Promise<UpdateResult> {
    this.assertWritesAllowed('update');

    const eventListener = await this.eventListenerRepository.findOneByOrFail({
      listenerId: id,
      eventId: updateEventListenerDto.eventId,
    });

    if (!eventListener) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          EventListenerEntity.name,
        ),
      );
    }

    return await this.eventListenerRepository.update(
      eventListener.listenerId,
      updateEventListenerDto,
    );
  }

  async remove(
    userId: number,
    eventId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.eventListenerRepository.delete({
      listenerId: id,
      eventId,
    });
  }

  private assertWritesAllowed(operation: 'create' | 'update'): void {
    this.logger.warn(
      `${operation} on deprecated event_listeners — ${EVENT_LISTENERS_DEPRECATED_MESSAGE}`,
    );

    if (this.platformFlags.isEventListenersWriteDisabled()) {
      throw new RpcException(EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE);
    }
  }

  private async loadNotificationRulesForEventId(eventId: number) {
    const event = await this.eventRepository.findOne({
      where: { eventId },
    });
    if (!event?.name) {
      return [];
    }

    return this.notificationRulesService.findAllForEventName(event.name);
  }

  private buildFindQuery(filters: FiltersDto): Record<string, unknown> {
    const query: Record<string, unknown> = {
      where: {},
    };

    if (filters.eventId !== undefined) {
      (query.where as Record<string, unknown>).eventId = filters.eventId;
    }

    query.relations = ['event', 'channel', 'template'];

    if (filters.isActive !== undefined) {
      (query.where as Record<string, unknown>).isActive = filters.isActive;
    }

    if (filters.search) {
      const baseWhere = query.where as Record<string, unknown>;
      query.where = [
        { ...baseWhere, event: { name: Like(`%${filters.search}%`) } },
        { ...baseWhere, channel: { name: Like(`%${filters.search}%`) } },
        { ...baseWhere, template: { name: Like(`%${filters.search}%`) } },
      ];
    }

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

  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }

  async getListenersByEventId(eventId: number): Promise<EventListenerEntity[]> {
    return await this.eventListenerRepository.find({
      where: { eventId, isActive: true },
      relations: ['channel', 'template'],
    });
  }

  async findOneByEventChannelTemplate(
    eventId: number,
    channelId: number,
    templateId: number,
  ): Promise<EventListenerEntity | null> {
    return await this.eventListenerRepository.findOne({
      where: { eventId, channelId, templateId },
    });
  }
}
