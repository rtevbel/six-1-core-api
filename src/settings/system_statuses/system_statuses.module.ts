import { Module } from '@nestjs/common';
import { SystemStatusesController } from './system_statuses.controller';
import { SystemStatusesService } from './system_statuses.service';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_SYSTEM_STATUSES_SERVICE_CLIENT_TOKEN } from './constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import {SystemStatusEntity} from './entities/system-status.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

/**
 * Module for managing system statuses.
 *
 * @version 0.0.1
 *
 * This module provides functionality for managing system statuses,
 * including creating, updating, retrieving, and deleting statuses.
 * It exports the SystemStatusesService for use in other modules.
 */
@Module({
    // Imports required modules and configurations.
    imports: [
      // Registers the SystemStatusEntity for TypeORM.
      TypeOrmModule.forFeature([SystemStatusEntity]),
      // Configures the message broker client for microservices.
      ClientsModule.registerAsync([
        {
          name: MESSAGE_BROKER_SYSTEM_STATUSES_SERVICE_CLIENT_TOKEN,
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
  controllers: [
    /**
     * Controller responsible for handling HTTP requests related to system statuses.
     */
    SystemStatusesController,
  ],
  providers: [
    /**
     * Service responsible for business logic related to system statuses.
     */
    SystemStatusesService,
  ],
  exports: [
    /**
     * Exports the SystemStatusesService to make it available in other modules.
     */
    SystemStatusesService,
  ],
})
export class SystemStatusesModule {}
