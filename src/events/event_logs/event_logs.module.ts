import { Module, forwardRef } from '@nestjs/common';
import { EventLogsService } from './event_logs.service';
import { EventLogsController } from './event_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from './entities/event_log.entity';
import { EventsModule } from '../events.module';
import { PlatformEventBusModule } from '../platform-bus/platform-event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventLogEntity]),
    forwardRef(() => EventsModule),
    forwardRef(() => PlatformEventBusModule),
  ],
  controllers: [EventLogsController],
  providers: [EventLogsService],
  exports: [EventLogsService],
})
export class EventLogsModule {}
