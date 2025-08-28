import { Module } from '@nestjs/common';
import { TenantTeamMemberService } from './tenant_team_members.service';
import { TenantTeamMemberController } from './tenant_team_members.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTeamMemberEntity } from './entities/tenant_team_member.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../../common/functions';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';
import { MESSAGE_BROKER_TENANT_TEAM_MEMBER_SERVICE_CLIENT_TOKEN } from './constants';

/**
 * TenantTeamMembersModule is responsible for managing tenant team members.
 * It includes the controller and service for handling operations related to tenant team members
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantTeamMemberEntity]),
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_TEAM_MEMBER_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantTeamMemberController],
  providers: [TenantTeamMemberService],
})
export class TenantTeamMembersModule {}
