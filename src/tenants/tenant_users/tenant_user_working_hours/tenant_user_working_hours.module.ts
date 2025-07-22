import { Module } from '@nestjs/common';
import { TenantUserWorkingHoursService } from './tenant_user_working_hours.service';
import { TenantUserWorkingHoursController } from './tenant_user_working_hours.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../../common/functions';
import { MESSAGE_BROKER_TENANT_USER_WORKING_HOURS_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';

/**
 * TenantUserWorkingHoursModule is responsible for managing tenant user working hours.
 * It includes the controller and service for handling operations related to tenant user working hours.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantUserWorkingHoursEntity for TypeORM.
    TypeOrmModule.forFeature([TenantUserWorkingHoursEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_USER_WORKING_HOURS_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantUserWorkingHoursController],

  // Specifies the providers that contain the business logic.
  providers: [TenantUserWorkingHoursService],
})
export class TenantUserWorkingHoursModule {}
