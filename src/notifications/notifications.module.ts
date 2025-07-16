import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelsService } from './notification_channels/notification_channels.service';
import { NotificationTemplatesService } from './notification_templates/notification_templates.service';
import { NotificationLogsService } from './notification_logs/notification_logs.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationChannelsService,
    NotificationTemplatesService,
    NotificationLogsService,
  ],
})
export class NotificationsModule {}
