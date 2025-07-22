// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant working hours
import { TenantWorkingHoursService } from './tenant_working_hours.service';
import { TenantWorkingHoursController } from './tenant_working_hours.controller';

// Importing configuration service and utility functions
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';

// Importing constants for message broker configuration
import { MESSAGE_BROKER_WORKING_HOURS_SERVICE_CLIENT_TOKEN } from './constants';

// Importing TypeORM module and entity for tenant working hours
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantWorkingHoursEntity } from './entities/tenant_working_hour.entity';

// Importing microservices module for message broker integration
import { ClientsModule, Transport } from '@nestjs/microservices';

// Importing common constants for message broker configuration keys
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

/**
 * TenantWorkingHoursModule is responsible for managing tenant working hours.
 * It includes the controller and service for handling operations related to tenant working hours
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantWorkingHoursEntity for TypeORM.
    TypeOrmModule.forFeature([TenantWorkingHoursEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_WORKING_HOURS_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantWorkingHoursController],

  // Specifies the providers that contain the business logic.
  providers: [TenantWorkingHoursService],
})
export class TenantWorkingHoursModule {}
