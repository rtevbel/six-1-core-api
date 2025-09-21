import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EventLogsService } from './event_logs.service';
import { CreateEventLogDto } from './dto/create-event_log.dto';
import { UpdateEventLogDto } from './dto/update-event_log.dto';
import { CreateEventLogsDto } from './dto/create-event_logs.dto';
import { FiltersDto } from './dto/filters.dto';
import { EventLogEntity } from './entities/event_log.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { OnEvent } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { EventCatalogService } from '../event-catalog.service';

import {
  MICROSERVICE_CREATE_EVENT_LOG_PATTERN,
  MICROSERVICE_FIND_ALL_EVENT_LOG_PATTERN,
  MICROSERVICE_FIND_ONE_EVENT_LOG_PATTERN,
  MICROSERVICE_UPDATE_EVENT_LOG_PATTERN,
  MICROSERVICE_REMOVE_EVENT_LOG_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('event-logs')
export class EventLogsController {
  constructor(
    private readonly logs: EventLogsService,
    private readonly catalog: EventCatalogService,
  ) {}

  /**
   * Handles the creation of a new event log.
   * @param userId - ID of the user making the request.
   * @param createEventLogDto - Data transfer object containing event log details.
   * @returns The created event log entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createEventLog(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createEventLogDto: CreateEventLogDto,
  ): Promise<EventLogEntity> {
    return this.logs.create(userId, createEventLogDto);
  }

  /**
   * Retrieves all event logs based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying event logs.
   * @returns A list of event logs matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllEventLogs(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.logs.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single event log by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the event log to retrieve.
   * @returns The event log entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_EVENT_LOG_PATTERN)
  findOneEventLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<EventLogEntity | NotFoundException> {
    return this.logs.findOne(userId, id);
  }

  /**
   * Updates an existing event log.
   * @param userId - ID of the user making the request.
   * @param updateEventLogDto - Data transfer object containing updated event log details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateEventLog(
    @Payload('userId') userId: number,
    @Payload('data') updateEventLogDto: UpdateEventLogDto,
  ): Promise<UpdateResult> {
    return this.logs.update(userId, updateEventLogDto.logId, updateEventLogDto);
  }

  /**
   * Deletes an event log by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the event log to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_EVENT_LOG_PATTERN)
  removeEventLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.logs.remove(userId, id);
  }

  /**
   * Dynamically handles all other events with a specific prefix.
   * @param eventName - The name of the event.
   * @param payload - The payload of the event.
   */
  /*@OnEvent(`six1-event.*`, { async: true })
  async handleDynamicEvent(@Payload('data') payload: any): Promise<void> {
    const eventName = payload.eventName || 'unknown_event';
    let userId = payload.userId || null;
    const createEventLogsDto = plainToInstance(
      CreateEventLogsDto,
      payload.data || {},
    );
    await this.logs.createEventLogByEventName(
      userId,
      eventName,
      createEventLogsDto,
    );
  }*/

  /**
   * Dynamically handles all other events with a specific prefix.
   * @param envelope - The envelope of the event.
   * @param eventName - The name of the event.
   */
  @OnEvent('six1-event.*', { async: true })
  async handle(envelope: any): Promise<void> {
    
    let eventName:string = envelope.eventName;
    if(eventName){
      eventName = eventName.replace('six1-event.','');
    }
    const eventId = await this.catalog.getIdByName(eventName);

    const entityId = envelope?.entity?.entityId ?? envelope?.entity?.id ?? null;
    const entityType =
      envelope?.entity?.entityType ??
      envelope?.entity?.constructor?.name ??
      null;

    const dto = plainToInstance(CreateEventLogDto, {
      eventId,
      userId: envelope?.userId ?? null,
      entityId: entityId ?? undefined,
      entityType: entityType ?? undefined,
      externalId: envelope?.externalId ?? undefined,
      createdBy: envelope?.createdBy ?? envelope?.userId ?? undefined,
    });

    await this.logs.create(1, dto, {
      payload: envelope?.data,
      eventName,
      correlationId: envelope?.correlationId,
      causationId: envelope?.causationId,
      tenantId: envelope?.tenantId,
      occurredAt: envelope?.occurredAt ?? new Date(),
    });
  }
}
