import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelsModule } from './notification_channels/notification_channels.module';
import { NotificationTemplatesModule } from './notification_templates/notification_templates.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationLogsModule } from './notification_logs/notification_logs.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_NOTIFICATION_SERVICE_CLIENT_TOKEN } from './constants';
import { EventListenersModule } from '../events/event_listeners/event_listeners.module';
import { EventLogsModule } from '../events/event_logs/event_logs.module';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';
import { UserNotificationPreferencesModule } from '../users/user-notification-preferences/user-notification-preferences.module';
import { NotificationTemplateRendererService } from './services/notification-template-renderer.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationJobService } from './services/notification-job.service';
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
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_NOTIFICATION_SERVICE_CLIENT_TOKEN,
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              // Constructs the message broker URL using configuration parameters.
              ensureDefinedConfigParam(
                configService.get<string>(MESSAGE_BROKER_URL_KEY),
                MESSAGE_BROKER_URL_KEY,
              ) +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_USERNAME_KEY),
                  MESSAGE_BROKER_USERNAME_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_PASSWORD_KEY),
                  MESSAGE_BROKER_PASSWORD_KEY,
                ) +
                '@' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_HOST_KEY),
                  MESSAGE_BROKER_HOST_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<number>(MESSAGE_BROKER_PORT_KEY),
                  MESSAGE_BROKER_PORT_KEY,
                ),
            ],
            // Specifies the queue name and options.
            queue: configService.get(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    NotificationChannelsModule,
    NotificationTemplatesModule,
    NotificationLogsModule,
    EventListenersModule,
    forwardRef(() => EventLogsModule),
    UserNotificationPreferencesModule,
    UsersModule,
    UserMetaModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationTemplateRendererService,
    NotificationDispatcherService,
    NotificationJobService,
    NotificationVariableResolverService,
    NotificationTemplateBindingService,
    NotificationUrlBuilderService,
    EmailNotificationSender,
    SmsNotificationSender,
    PushNotificationSender,
    SystemNotificationSender,
  ],
  exports: [NotificationUrlBuilderService],
})
export class NotificationsModule {}
