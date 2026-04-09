import { Module } from '@nestjs/common';
import { NotificationChannelsService } from './notification_channels.service';
import { NotificationChannelsController } from './notification_channels.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationChannelEntity } from './entities/notification_channel.entity';

/**
 * NotificationChannelsModule is responsible for managing notification channels.
 * It includes the controller and service for handling operations related to notification channels.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the NotificationChannelEntity for TypeORM.
    TypeOrmModule.forFeature([NotificationChannelEntity]),
  ],
  controllers: [NotificationChannelsController],
  providers: [NotificationChannelsService],
  exports: [NotificationChannelsService],
})

export class NotificationChannelsModule {}
