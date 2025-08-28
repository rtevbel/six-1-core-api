import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelsModule } from './notification_channels/notification_channels.module';
import { NotificationTemplatesModule } from './notification_templates/notification_templates.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_NOTIFICATION_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';
import { NotificationLogsModule } from './notification_logs/notification_logs.module';

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
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
