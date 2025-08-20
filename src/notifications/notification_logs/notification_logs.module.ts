import { Module } from '@nestjs/common';
import { NotificationLogsService } from './notification_logs.service';
import { NotificationLogsController } from './notification_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogEntity } from './entities/notification_log.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_NOTIFICATION_LOG_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

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
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_NOTIFICATION_LOG_SERVICE_CLIENT_TOKEN,
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
  ],
  controllers: [NotificationLogsController],
  providers: [NotificationLogsService],
})
export class NotificationLogsModule {}