// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant off days
import { TenantOffDaysService } from './tenant_off_days.service';
import { TenantOffDaysController } from './tenant_off_days.controller';

// Importing configuration service and utility functions
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantOffDaysEntity } from './entities/tenant_off_day.entity';

// Importing constants for message broker configuration
import { MESSAGE_BROKER_TENANT_OFF_DAYS_SERVICE_CLIENT_TOKEN } from './constants';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

// Importing microservices module for message broker configuration
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * TenantOffDaysModule is responsible for managing tenant off days.
 * It includes the controller and service for handling operations related to tenant off days
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantOffDaysEntity for TypeORM.
    TypeOrmModule.forFeature([TenantOffDaysEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_OFF_DAYS_SERVICE_CLIENT_TOKEN,
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ, // Specifies RabbitMQ as the transport protocol
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
              durable: false, // Ensures the queue is not persistent
            },
          },
        }),
        inject: [ConfigService], // Injects the ConfigService for accessing configuration parameters
      },
    ]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantOffDaysController],

  // Specifies the providers that contain the business logic.
  providers: [TenantOffDaysService],
})
export class TenantOffDaysModule {}
