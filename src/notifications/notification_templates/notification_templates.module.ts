import { Module } from '@nestjs/common';
import { NotificationTemplatesService } from './notification_templates.service';
import { NotificationTemplatesController } from './notification_templates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_NOTIFICATION_TEMPLATE_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

/**
 * NotificationTemplatesModule is responsible for managing notification templates.
 * It includes the controller and service for handling operations related to notification templates.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the NotificationTemplateEntity for TypeORM.
    TypeOrmModule.forFeature([NotificationTemplateEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_NOTIFICATION_TEMPLATE_SERVICE_CLIENT_TOKEN,
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
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
