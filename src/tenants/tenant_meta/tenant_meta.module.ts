// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant metadata
import { TenantMetaService } from './tenant_meta.service';
import { TenantMetaController } from './tenant_meta.controller';

// Importing configuration service and utility functions
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';

// Importing constants for message broker configuration
import { MESSAGE_BROKER_TENANT_META_SERVICE_CLIENT_TOKEN } from './constants';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

// Importing TypeORM module and entity for tenant metadata
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMetaEntity } from './entities/tenant_meta.entity';

// Importing microservices module for message broker configuration
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * TenantMetaModule is responsible for managing tenant metadata.
 * It includes the controller and service for handling operations
 * related to tenant metadata and integrates message broker configuration.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantMetaEntity for TypeORM.
    TypeOrmModule.forFeature([TenantMetaEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_META_SERVICE_CLIENT_TOKEN,
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
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantMetaController],

  // Specifies the providers that contain the business logic.
  providers: [TenantMetaService],
})
export class TenantMetaModule {}
