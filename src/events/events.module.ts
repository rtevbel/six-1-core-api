import { Global, Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventCatalogService } from './event-catalog.service';
import { PlatformEventFlagsService } from './config/platform-event-flags.service';
import { PlatformEventBusModule } from './platform-bus/platform-event-bus.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventListenersModule } from './event_listeners/event_listeners.module';
import { EventLogsModule } from './event_logs/event_logs.module';

import { EventNotificationRulesModule } from './event_notification_rules/event_notification_rules.module';
import { SystemEntityEventEmitterService } from './system-entity-event-emitter.service';
import { SystemEntityUpdateSubscriber } from './subscribers/system-entity-update.subscriber';

/**
 * EventsModule is responsible for managing events.
 * It includes the controller and service for handling operations related to events.
 *
 * @version 0.0.1
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    EventListenersModule,
    EventNotificationRulesModule,
    forwardRef(() => EventLogsModule),
    forwardRef(() => PlatformEventBusModule),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventCatalogService,
    PlatformEventFlagsService,
    SystemEntityEventEmitterService,
    SystemEntityUpdateSubscriber,
  ],
  exports: [
    EventsService,
    EventCatalogService,
    PlatformEventFlagsService,
    SystemEntityEventEmitterService,
  ],
})
export class EventsModule {}
