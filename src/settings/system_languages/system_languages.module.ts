import { Module } from '@nestjs/common';
import { SystemLanguagesController } from './system_languages.controller';
import { SystemLanguagesService } from './system_languages.service';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_SYSTEM_LANGUAGES_SERVICE_CLIENT_TOKEN } from './constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLanguageEntity } from './entities/system-language.entity';
import { RoleDescriptionEntity } from '../../roles/entities/role-description.entity';
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
 * Module for managing system languages.
 *
 * @version 0.0.1
 *
 * This module provides functionality for managing system languages,
 * including creating, updating, retrieving, and deleting languages.
 * It exports the SystemLanguagesService for use in other modules.
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the SystemLanguageEntity , RoleDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([SystemLanguageEntity, RoleDescriptionEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_SYSTEM_LANGUAGES_SERVICE_CLIENT_TOKEN,
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
     * Controller responsible for handling HTTP requests related to system languages.
     */
    SystemLanguagesController,
  ],
  providers: [
    /**
     * Service responsible for business logic related to system languages.
     */
    SystemLanguagesService,
  ],
  exports: [
    /**
     * Exports the SystemLanguagesService to make it available in other modules.
     */
    SystemLanguagesService,
  ],
})
export class SystemLanguagesModule {}
