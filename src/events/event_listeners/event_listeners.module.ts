import { Module } from '@nestjs/common';
import { EventListenersService } from './event_listeners.service';
import { EventListenersController } from './event_listeners.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventListenerEntity } from './entities/event_listener.entity';
import { EventEntity } from '../entities/event.entity';
import { EventNotificationRulesModule } from '../event_notification_rules/event_notification_rules.module';

/**
 * EventListenersModule is responsible for managing event listeners.
 * @deprecated Prefer {@link EventNotificationRulesModule} for new notification wiring.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EventListenerEntity, EventEntity]),
    EventNotificationRulesModule,
  ],
  controllers: [EventListenersController],
  providers: [EventListenersService],
  exports: [EventListenersService],
})
export class EventListenersModule {}
