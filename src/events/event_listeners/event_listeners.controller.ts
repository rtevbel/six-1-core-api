import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EventListenersService } from './event_listeners.service';
import { CreateEventListenerDto } from './dto/create-event_listener.dto';
import { UpdateEventListenerDto } from './dto/update-event_listener.dto';
import { FiltersDto } from './dto/filters.dto';
import { EventListenerEntity } from './entities/event_listener.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_EVENT_LISTENER_PATTERN,
  MICROSERVICE_FIND_ALL_EVENT_LISTENER_PATTERN,
  MICROSERVICE_FIND_ONE_EVENT_LISTENER_PATTERN,
  MICROSERVICE_UPDATE_EVENT_LISTENER_PATTERN,
  MICROSERVICE_REMOVE_EVENT_LISTENER_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '.././../common/pipes/app-rpc-validation.pipe';

@Controller('event-listeners')
export class EventListenersController {
  constructor(private readonly eventListenersService: EventListenersService) {}

  /**
   * @deprecated Use `v0.1_create_event_notification_rule` instead.
   */
  @MessagePattern(MICROSERVICE_CREATE_EVENT_LISTENER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createEventListener(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createEventListenerDto: CreateEventListenerDto,
  ): Promise<EventListenerEntity> {
    return this.eventListenersService.create(userId, createEventListenerDto);
  }

  /**
   * @deprecated Prefer `v0.1_find_all_event_notification_rules`. Returns legacy
   * listeners plus optional `notificationRuleRecords` read shim.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_EVENT_LISTENER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllEventListeners(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.eventListenersService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single event listener by its ID and associated event ID.
   * @param userId - ID of the user making the request.
   * @param eventId - ID of the event associated with the listener.
   * @param id - ID of the event listener to retrieve.
   * @returns The event listener entity or a NotFoundException if not found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_EVENT_LISTENER_PATTERN)
  findOneEventListener(
    @Payload('userId') userId: number,
    @Payload('eventId', ParseIntPipe) eventId: number,
    @Payload('id', ParseIntPipe) id: number,
  ): Promise<EventListenerEntity | NotFoundException> {
    return this.eventListenersService.findOne(userId, eventId, id);
  }

  /**
   * @deprecated Use `v0.1_update_event_notification_rule` instead.
   */
  @MessagePattern(MICROSERVICE_UPDATE_EVENT_LISTENER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateEventListener(
    @Payload('userId') userId: number,
    @Payload('data') updateEventListenerDto: UpdateEventListenerDto,
  ): Promise<UpdateResult> {
    return this.eventListenersService.update(
      userId,
      updateEventListenerDto.listenerId,
      updateEventListenerDto,
    );
  }

  /**
   * Deletes an event listener by its ID and associated event ID.
   * @param userId - ID of the user making the request.
   * @param eventId - ID of the event associated with the listener.
   * @param id - ID of the event listener to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_EVENT_LISTENER_PATTERN)
  removeEventListener(
    @Payload('userId') userId: number,
    @Payload('eventId', ParseIntPipe) eventId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.eventListenersService.remove(userId, eventId, id);
  }
}
