import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { UserMetaModule } from './user-meta/user-meta.module';
import { UserNotificationPreferencesModule } from './user-notification-preferences/user-notification-preferences.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN } from './constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
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
 * UsersModule is the main module responsible for managing user-related functionality.
 * It imports submodules for user metadata, notification preferences, and roles,
 * and provides the main service and controller for user operations.
 *
 * @version 0.0.1
 *
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the UserEntity for TypeORM.
    TypeOrmModule.forFeature([UserEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN,
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
    UserMetaModule,
    UserNotificationPreferencesModule,
    UserRolesModule,
  ],

  // Specifies the controllers that handle incoming requests.
  controllers: [UserController],
  // Specifies the providers that contain the business logic.
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
