import {
  Controller,
  Logger,
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
import { PLATFORM_EVENT_NAMES } from '../constants/platform-event-names.constants';
import type { EventEnvelope } from '../types';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import { PlatformEventNotificationBridgeService } from '../platform-event-notification-bridge.service';

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
  private readonly logger = new Logger(EventLogsController.name);

  constructor(
    private readonly logs: EventLogsService,
    private readonly notificationBridge: PlatformEventNotificationBridgeService,
    private readonly platformFlags: PlatformEventFlagsService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createEventLog(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createEventLogDto: CreateEventLogDto,
  ): Promise<EventLogEntity> {
    return this.logs.create(userId, createEventLogDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllEventLogs(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.logs.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_EVENT_LOG_PATTERN)
  findOneEventLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<EventLogEntity | NotFoundException> {
    return this.logs.findOne(userId, id);
  }

  @MessagePattern(MICROSERVICE_UPDATE_EVENT_LOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateEventLog(
    @Payload('userId') userId: number,
    @Payload('data') updateEventLogDto: UpdateEventLogDto,
  ): Promise<UpdateResult> {
    return this.logs.update(userId, updateEventLogDto.logId, updateEventLogDto);
  }

  @MessagePattern(MICROSERVICE_REMOVE_EVENT_LOG_PATTERN)
  removeEventLog(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.logs.remove(userId, id);
  }

  /** @deprecated Shim — active when platform bus is off. */
  @OnEvent('six1-event.notification.*', { async: true })
  async handleDeprecatedNotificationEvent(envelope: EventEnvelope): Promise<void> {
    if (this.platformFlags.isEventBusEnabled()) {
      return;
    }
    await this.notificationBridge.handle(envelope);
  }

  /** @deprecated Shim — active when platform bus is off. */
  @OnEvent(PLATFORM_EVENT_NAMES.PROJECT_CREATED, { async: true })
  @OnEvent(PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED, { async: true })
  @OnEvent(PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED, { async: true })
  @OnEvent(PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED, { async: true })
  async handleCanonicalNotificationEvent(
    envelope: EventEnvelope,
  ): Promise<void> {
    if (this.platformFlags.isEventBusEnabled()) {
      return;
    }
    await this.notificationBridge.handle(envelope);
  }
}
