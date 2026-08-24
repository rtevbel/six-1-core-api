import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelsModule } from './notification_channels/notification_channels.module';
import { NotificationTemplatesModule } from './notification_templates/notification_templates.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationLogsModule } from './notification_logs/notification_logs.module';
import { EventListenersModule } from '../events/event_listeners/event_listeners.module';
import { EventNotificationRulesModule } from '../events/event_notification_rules/event_notification_rules.module';
import { EventLogsModule } from '../events/event_logs/event_logs.module';
import { UserNotificationPreferencesModule } from '../users/user-notification-preferences/user-notification-preferences.module';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationJobService } from './services/notification-job.service';
import { NotificationDispatchPipelineService } from './services/notification-dispatch-pipeline.service';
import { NotificationImmediateDispatchService } from './services/notification-immediate-dispatch.service';
import { NotificationVariableResolverService } from './services/notification-variable-resolver.service';
import { NotificationTemplateBindingService } from './services/notification-template-binding.service';
import { NotificationUrlBuilderService } from './services/notification-url-builder.service';
import { UsersModule } from '../users/users.module';
import { UserMetaModule } from '../users/user-meta/user-meta.module';
import {
  EmailNotificationSender,
  PushNotificationSender,
  SmsNotificationSender,
  SystemNotificationSender,
} from './services/notification-senders.service';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { NotificationContextModule } from './context/notification-context.module';
import { NotificationCatalogModule } from './catalog/notification-catalog.module';

/**
 * NotificationsModule is responsible for managing notifications.
 * It includes the controller and service for handling operations related to notifications.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the NotificationEntity for TypeORM.
    TypeOrmModule.forFeature([NotificationEntity]),
    NotificationChannelsModule,
    NotificationTemplatesModule,
    NotificationLogsModule,
    EventListenersModule,
    EventNotificationRulesModule,
    forwardRef(() => EventLogsModule),
    UserNotificationPreferencesModule,
    forwardRef(() => UsersModule),
    forwardRef(() => UserMetaModule),
    forwardRef(() => ConfigObjectsModule),
    forwardRef(() => NotificationContextModule),
    forwardRef(() => NotificationCatalogModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatcherService,
    NotificationJobService,
    NotificationDispatchPipelineService,
    NotificationImmediateDispatchService,
    NotificationVariableResolverService,
    NotificationTemplateBindingService,
    NotificationUrlBuilderService,
    EmailNotificationSender,
    SmsNotificationSender,
    PushNotificationSender,
    SystemNotificationSender,
  ],
  exports: [
    NotificationsService,
    NotificationUrlBuilderService,
    NotificationCatalogModule,
    NotificationImmediateDispatchService,
    NotificationDispatchPipelineService,
  ],
})
export class NotificationsModule {}
