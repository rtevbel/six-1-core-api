import { Module } from '@nestjs/common';
import { EventListenersService } from './event_listeners.service';
import { EventListenersController } from './event_listeners.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventListenerEntity } from './entities/event_listener.entity';

/**
 * EventListenersModule is responsible for managing event listeners.
 * It includes the controller and service for handling operations related to event listeners.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the EventListenerEntity for TypeORM.
    TypeOrmModule.forFeature([EventListenerEntity]),
  ],
  controllers: [EventListenersController],
  providers: [EventListenersService],
  exports: [EventListenersService],
})
export class EventListenersModule {}
