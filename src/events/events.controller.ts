import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FiltersDto } from './dto/filters.dto';
import { EventEntity } from './entities/event.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_EVENT_PATTERN,
  MICROSERVICE_FIND_ALL_EVENT_PATTERN,
  MICROSERVICE_FIND_ONE_EVENT_PATTERN,
  MICROSERVICE_UPDATE_EVENT_PATTERN,
  MICROSERVICE_REMOVE_EVENT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Handles the creation of a new event.
   * @param userId - ID of the user making the request.
   * @param createEventDto - Data transfer object containing event details.
   * @returns The created event entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_EVENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createEvent(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createEventDto: CreateEventDto,
  ): Promise<EventEntity> {
    return this.eventsService.create(userId, createEventDto);
  }

  /**
   * Retrieves all events based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying events.
   * @returns A list of events matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_EVENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllEvents(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.eventsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single event by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the event to retrieve.
   * @returns The event entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_EVENT_PATTERN)
  findOneEvent(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<EventEntity | NotFoundException> {
    return this.eventsService.findOne(userId, id);
  }

  /**
   * Updates an existing event.
   * @param userId - ID of the user making the request.
   * @param updateEventDto - Data transfer object containing updated event details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_EVENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateEvent(
    @Payload('userId') userId: number,
    @Payload('data') updateEventDto: UpdateEventDto,
  ): Promise<UpdateResult> {
    return this.eventsService.update(
      userId,
      updateEventDto.eventId,
      updateEventDto,
    );
  }

  /**
   * Deletes an event by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the event to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_EVENT_PATTERN)
  removeEvent(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.eventsService.remove(userId, id);
  }
}
