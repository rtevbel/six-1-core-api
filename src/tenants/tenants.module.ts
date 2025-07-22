// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenants
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

// Importing submodules related to tenant management
import { TenantTypesModule } from './tenant_types/tenant_types.module'; // Handles tenant types
import { TenantMetaModule } from './tenant_meta/tenant_meta.module'; // Manages tenant metadata
import { TenantWorkingHoursModule } from './tenant_working_hours/tenant_working_hours.module'; // Manages tenant working hours
import { TenantOffDaysModule } from './tenant_off_days/tenant_off_days.module'; // Handles tenant off days
import { TenantContactInfoModule } from './tenant_contact_info/tenant_contact_info.module'; // Manages tenant contact information
import { TenantBillingInfoModule } from './tenant_billing_info/tenant_billing_info.module'; // Handles tenant billing information
import { TenantSubscriptionsModule } from './tenant_subscriptions/tenant_subscriptions.module'; // Manages tenant subscriptions
import { TenantConfigurationsModule } from './tenant_configurations/tenant_configurations.module'; // Handles tenant configurations
import { TenantUsersModule } from './tenant_users/tenant_users.module'; // Manages tenant users
import { TenantTeamsModule } from './tenant_teams/tenant_teams.module'; // Handles tenant teams

import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_TENANT_SERVICE_CLIENT_TOKEN } from './constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';

/**
 * TenantsModule is responsible for managing tenants.
 * It includes the controller and service for handling operations
 * related to tenants and integrates various submodules for tenant management.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantEntity for TypeORM.
    TypeOrmModule.forFeature([TenantEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_SERVICE_CLIENT_TOKEN,
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
    TenantTypesModule, // Module for managing tenant types
    TenantMetaModule, // Module for managing tenant metadata
    TenantWorkingHoursModule, // Module for managing tenant working hours
    TenantOffDaysModule, // Module for managing tenant off days
    TenantContactInfoModule, // Module for managing tenant contact information
    TenantBillingInfoModule, // Module for managing tenant billing information
    TenantSubscriptionsModule, // Module for managing tenant subscriptions
    TenantConfigurationsModule, // Module for managing tenant configurations
    TenantUsersModule, // Module for managing tenant users
    TenantTeamsModule, // Module for managing tenant teams
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantsController],

  // Specifies the providers that contain the business logic.
  providers: [TenantsService],
})
export class TenantsModule {}
