// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant types
import { TenantTypesService } from './tenant_types.service';
import { TenantTypesController } from './tenant_types.controller';

// Importing configuration service and utility functions
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';

// Importing constants for message broker configuration
import { MESSAGE_BROKER_TENANT_TYPE_SERVICE_CLIENT_TOKEN } from './constants';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

// Importing TypeORM module and entity for tenant types
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTypeEntity } from './entities/tenant_type.entity';

// Importing microservices module for RabbitMQ integration
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * TenantTypesModule is responsible for managing tenant types.
 * It includes the controller and service for handling operations
 * related to tenant types and integrates RabbitMQ for message brokering.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantTypeEntity for TypeORM.
    TypeOrmModule.forFeature([TenantTypeEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_TYPE_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantTypesController],

  // Specifies the providers that contain the business logic.
  providers: [TenantTypesService],
})
export class TenantTypesModule {}
