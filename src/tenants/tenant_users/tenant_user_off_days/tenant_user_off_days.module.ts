import { Module } from '@nestjs/common';
import { TenantUserOffDaysService } from './tenant_user_off_days.service';
import { TenantUserOffDaysController } from './tenant_user_off_days.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserOffDaysEntity } from './entities/tenant_user_off_day.entity';
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
import { MESSAGE_BROKER_TENANT_USER_OFF_DAYS_SERVICE_CLIENT_TOKEN } from './constants';

/**
 * TenantUserOffDaysModule is responsible for managing tenant user off days.
 * It includes the controller and service for handling operations related to tenant user off days
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserOffDaysEntity]),
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_USER_OFF_DAYS_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantUserOffDaysController],
  providers: [TenantUserOffDaysService],
})
export class TenantUserOffDaysModule {}
