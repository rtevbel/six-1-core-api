import { Module, forwardRef } from '@nestjs/common';
import { EventLogsService } from './event_logs.service';
import { EventLogsController } from './event_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from './entities/event_log.entity';
import { EventsModule } from '../events.module';
import { EventCatalogService } from '../event-catalog.service';

/**
 * EventLogsModule is responsible for managing event logs.
 * It includes the controller and service for handling operations related to event logs.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the EventLogEntity for TypeORM.
    TypeOrmModule.forFeature([EventLogEntity]),
    forwardRef(() => EventsModule),
  ],
  controllers: [EventLogsController],
  providers: [EventLogsService, EventCatalogService],
  exports: [EventLogsService],
})
export class EventLogsModule {}
