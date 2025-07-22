// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant billing information
import { TenantBillingInfoService } from './tenant_billing_info.service';
import { TenantBillingInfoController } from './tenant_billing_info.controller';

// Importing configuration service and utility functions
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';

// Importing constants for message broker configuration
import { MESSAGE_BROKER_BILLING_INFO_SERVICE_CLIENT_TOKEN } from './constants';
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
 * TenantBillingInfoModule is responsible for managing tenant billing information.
 * It includes the controller and service for handling operations related to tenant billing
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantBillingInfoEntity for TypeORM.
    TypeOrmModule.forFeature([TenantBillingInfoEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_BILLING_INFO_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantBillingInfoController],

  // Specifies the providers that contain the business logic.
  providers: [TenantBillingInfoService],
})
export class TenantBillingInfoModule {}
