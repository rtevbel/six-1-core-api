import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelsModule } from './notification_channels/notification_channels.module';
import { NotificationTemplatesModule } from './notification_templates/notification_templates.module';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
  ],
  imports: [NotificationChannelsModule, NotificationTemplatesModule],
})
export class NotificationsModule {}
