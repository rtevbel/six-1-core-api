import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserPasswordEntity } from '../user-passwords/entities/user-password.entity';
import { UserPasswordsService } from '../user-passwords/user-passwords.service';
import { UserLoginTokenEntity } from '../user-login-tokens/entities/user-login-token.entity';
import { UserLoginTokensService } from '../user-login-tokens/user-login-tokens.service';
import {
  MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN,
  MESSAGE_BROKER_USER_SERVICE_QUEUE_NAME,
} from './constants';
import {
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  MESSAGE_BROKER_USERNAME_KEY,
} from '../common/constants';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      UserPasswordEntity,
      UserLoginTokenEntity,
    ]),
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN,
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
            queue: configService.get(MESSAGE_BROKER_USER_SERVICE_QUEUE_NAME),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserPasswordsService, UserLoginTokensService],
})
export class UsersModule {}
