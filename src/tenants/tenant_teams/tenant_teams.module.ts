import { Module } from '@nestjs/common';
import { TenantTeamService } from './tenant_teams.service';
import { TenantTeamController } from './tenant_teams.controller';
import { TenantTeamMembersModule } from './tenant_team_members/tenant_team_members.module';
import { TenantTeamProjectsModule } from './tenant_team_projects/tenant_team_projects.module';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../../common/functions';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTeamEntity } from './entities/tenant_team.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';
import { MESSAGE_BROKER_TENANT_TEAM_SERVICE_CLIENT_TOKEN } from './constants';

/**
 * TenantTeamsModule is responsible for managing tenant teams.
 * It includes the controller and service for handling operations related to tenant teams
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantTeamEntity]),
    TenantTeamMembersModule,
    TenantTeamProjectsModule,
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_TENANT_TEAM_SERVICE_CLIENT_TOKEN,
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
  controllers: [TenantTeamController],
  providers: [TenantTeamService],
})
export class TenantTeamsModule {}