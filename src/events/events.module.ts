import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventListenersService } from './event_listeners/event_listeners.service';
import { EventLogsService } from './event_logs/event_logs.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventListenersService, EventLogsService],
})
export class EventsModule {}
