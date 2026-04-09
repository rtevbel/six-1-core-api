import { Global, Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventListenersModule } from './event_listeners/event_listeners.module';
import { EventLogsModule } from './event_logs/event_logs.module';

/**
 * EventsModule is responsible for managing events.
 * It includes the controller and service for handling operations related to events.
 *
 * @version 0.0.1
 */
@Global()
@Module({
  imports: [
    // Registers the EventEntity for TypeORM.
    TypeOrmModule.forFeature([EventEntity]),
    EventListenersModule,
    forwardRef(() => EventLogsModule),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
