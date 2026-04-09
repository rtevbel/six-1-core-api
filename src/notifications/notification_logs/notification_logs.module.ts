import { Module } from '@nestjs/common';
import { NotificationLogsService } from './notification_logs.service';
import { NotificationLogsController } from './notification_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogEntity } from './entities/notification_log.entity';

/**
 * NotificationLogsModule is responsible for managing notification logs.
 * It includes the controller and service for handling operations related to notification logs.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the NotificationLogEntity for TypeORM.
    TypeOrmModule.forFeature([NotificationLogEntity]),
  ],
  controllers: [NotificationLogsController],
  providers: [NotificationLogsService],
  exports: [NotificationLogsService],
})
export class NotificationLogsModule {}
