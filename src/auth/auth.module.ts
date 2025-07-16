import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { Transport, ClientsModule } from '@nestjs/microservices';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import { OidcClient } from './oidc-client';
import { APP_FILTER } from '@nestjs/core';
import { CustomStrategy } from './strategies/custom.strategy';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppConfigService } from '../common/services/app-config.service';
import { ensureDefinedConfigParam } from '../common/functions';
import {UsersModule} from "../users/users.module";
import {
  MESSAGE_BROKER_AUTH_TOKEN,
  REDIS_CLIENT_TYPE,
  REDIS_DATABASE_HOST_KEY,
  REDIS_DATABASE_PASSWORD_KEY,
  REDIS_DATABASE_PORT_KEY,
  REDIS_DATABASE_URL_KEY,
  JWT_EXPIRATION_TIME_KEY,
  JWT_SECRET_KEY,
} from './constants';

import {
  DEFAULT_ENVIRONMENT_FILE_NAME,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  MESSAGE_BROKER_USERNAME_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';

/**
 * AuthModule is responsible for authentication and authorization.
 * It integrates Redis for caching, JWT for token-based authentication,
 * and a message broker for microservice communication.
 * 
 * @Version 0.0.1
 * 
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Configures Redis for caching.
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: REDIS_CLIENT_TYPE,
        url:
          ensureDefinedConfigParam(
            configService.get<string>(REDIS_DATABASE_URL_KEY),
            REDIS_DATABASE_URL_KEY,
          ) +
          ensureDefinedConfigParam(
            configService.get<string>(REDIS_DATABASE_PASSWORD_KEY),
            REDIS_DATABASE_PASSWORD_KEY,
          ) +
          '@' +
          ensureDefinedConfigParam(
            configService.get<string>(REDIS_DATABASE_HOST_KEY),
            REDIS_DATABASE_HOST_KEY,
          ) +
          ':' +
          ensureDefinedConfigParam(
            configService.get<number>(REDIS_DATABASE_PORT_KEY),
            REDIS_DATABASE_PORT_KEY,
          ),
      }),
      inject: [ConfigService],
    }),
    // Integrates Passport for authentication strategies.
    PassportModule,
    // Configures JWT for token-based authentication.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: ensureDefinedConfigParam(
          configService.get(JWT_SECRET_KEY),
          JWT_SECRET_KEY,
        ),
        signOptions: {
          expiresIn: configService.get<string>(JWT_EXPIRATION_TIME_KEY),
        },
      }),
      inject: [ConfigService],
    }),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_AUTH_TOKEN,
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
                  configService.get<string>(MESSAGE_BROKER_PORT_KEY),
                  MESSAGE_BROKER_PORT_KEY,
                ),
            ],
            queue: ensureDefinedConfigParam(
              configService.get<string>(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
              SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
            ),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    UsersModule
  ],
  
  // Specifies the controllers that handle incoming requests.
  controllers: [AuthController],

  // Specifies the providers that contain the business logic.
  providers: [
    AuthService,
    {
      provide: ConfigService,
      useClass: AppConfigService,
    },
    {
      provide: APP_FILTER,
      useClass: AppRpcExceptionsFilter,
    },
    JwtStrategy,
    OidcClient,
    CustomStrategy,
  ],
})
export class AuthModule {}