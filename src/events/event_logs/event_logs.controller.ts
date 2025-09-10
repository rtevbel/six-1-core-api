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
import { FiltersDto } from './dto/filters.dto';
import { EventLogEntity } from './entities/event_log.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { OnEvent } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';

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

  constructor(private readonly eventLogsService: EventLogsService) {}

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
    return this.eventLogsService.create(userId, createEventLogDto);
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
    return this.eventLogsService.findAll(userId, filtersDto);
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
    return this.eventLogsService.findOne(userId, id);
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
    return this.eventLogsService.update(
      userId,
      updateEventLogDto.logId,
      updateEventLogDto,
    );
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
    return this.eventLogsService.remove(userId, id);
  }

   /**
   * Dynamically handles all other events with a specific prefix.
   * @param eventName - The name of the event.
   * @param payload - The payload of the event.
   */
   @OnEvent(`six1-event.*`)
   async handleDynamicEvent(eventName: string, payload: any): Promise<void>{
     console.log(`Received dynamic event: ${eventName}`);
     console.log(`Payload:`, payload);
     let userId = payload.userId || null;
     const createEventLogDto = plainToInstance(CreateEventLogDto, payload.data || {});
     await  this.eventLogsService.createEventLogByEventName(userId , eventName, createEventLogDto);
   }
}