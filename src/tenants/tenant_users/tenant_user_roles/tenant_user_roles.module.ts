import { Module } from '@nestjs/common';
import { TenantUserRoleService } from './tenant_user_roles.service';
import { TenantUserRoleController } from './tenant_user_roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../../common/functions';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';
import { MESSAGE_BROKER_TENANT_USER_ROLE_SERVICE_CLIENT_TOKEN } from './constants';

/**
 * TenantUserRolesModule is responsible for managing tenant user roles.
 * It includes the controller and service for handling operations related to tenant user roles
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserRoleEntity]),
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_USER_ROLE_SERVICE_CLIENT_TOKEN,
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
  ],
  controllers: [TenantUserRoleController],
  providers: [TenantUserRoleService],
})
export class TenantUserRolesModule {}
