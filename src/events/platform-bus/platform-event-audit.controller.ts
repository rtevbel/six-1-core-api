import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { PlatformEventRecordsService } from './platform-event-records.service';
import { PlatformEventTimelineService } from './platform-event-timeline.service';
import {
  EventTimelineFiltersDto,
  PlatformEventRecordFiltersDto,
} from './dto/platform-event-audit-filters.dto';
import type {
  EventTimelineResult,
  PlatformEventRecordFindAllResult,
} from './interfaces/event-timeline.interface';
import {
  MICROSERVICE_FIND_PLATFORM_EVENT_RECORDS_PATTERN,
  MICROSERVICE_GET_EVENT_TIMELINE_PATTERN,
} from './constants';

@Controller('platform-event-audit')
export class PlatformEventAuditController {
  constructor(
    private readonly recordsService: PlatformEventRecordsService,
    private readonly timelineService: PlatformEventTimelineService,
  ) {}

  @MessagePattern(MICROSERVICE_FIND_PLATFORM_EVENT_RECORDS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findPlatformEventRecords(
    @Payload('userId', ParseIntPipe) _userId: number,
    @Payload('data') filters: PlatformEventRecordFiltersDto,
  ): Promise<PlatformEventRecordFindAllResult> {
    return this.recordsService.findAll(filters);
  }

  @MessagePattern(MICROSERVICE_GET_EVENT_TIMELINE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  getEventTimeline(
    @Payload('userId', ParseIntPipe) _userId: number,
    @Payload('data') filters: EventTimelineFiltersDto,
  ): Promise<EventTimelineResult> {
    return this.timelineService.getTimeline(filters);
  }
}
