import { Module } from '@nestjs/common';
import { TenantUsersService } from './tenant_users.service';
import { TenantUsersController } from './tenant_users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUsersEntity } from './entities/tenant_user.entity';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';
import { MESSAGE_BROKER_TENANT_USER_SERVICE_CLIENT_TOKEN } from './constants';

import { TenantUserInvitationsModule } from './tenant_user_invitations/tenant_user_invitations.module';
import { TenantUserConfigurationsModule } from './tenant_user_configurations/tenant_user_configurations.module';
import { TenantUserWorkingHoursModule } from './tenant_user_working_hours/tenant_user_working_hours.module';
import { TenantUserOffDaysModule } from './tenant_user_off_days/tenant_user_off_days.module';
import { TenantUserMetaModule } from './tenant_user_meta/tenant_user_meta.module';
import { TenantUserRolesModule } from './tenant_user_roles/tenant_user_roles.module';

/**
 * TenantUsersModule is responsible for managing tenant users.
 * It includes the controller and service for handling operations related to tenant users
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUsersEntity]),
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_USER_SERVICE_CLIENT_TOKEN,
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
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
            queue: configService.get(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    TenantUserInvitationsModule,
    TenantUserConfigurationsModule,
    TenantUserWorkingHoursModule,
    TenantUserOffDaysModule,
    TenantUserMetaModule,
    TenantUserRolesModule,
  ],
  controllers: [TenantUsersController],
  providers: [TenantUsersService],
})
export class TenantUsersModule {}
