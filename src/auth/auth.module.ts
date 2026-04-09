import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
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
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUserRoleEntity } from '../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { TenantUsersEntity } from '../tenants/tenant_users/entities/tenant_user.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { RoleDescriptionEntity } from '../roles/entities/role-description.entity';
import { PermissionDescriptionEntity } from '../permissions/entities/permission_description.entity';
import {
  REDIS_CLIENT_TYPE,
  REDIS_DATABASE_HOST_KEY,
  REDIS_DATABASE_PASSWORD_KEY,
  REDIS_DATABASE_PORT_KEY,
  REDIS_DATABASE_URL_KEY,
  JWT_EXPIRATION_TIME_KEY,
  JWT_SECRET_KEY,
} from './constants';

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
    // Registers TypeORM entities for database operations.
    TypeOrmModule.forFeature([
      UserRoleEntity,
      TenantUserRoleEntity,
      TenantUsersEntity,
      TenantEntity,
      RoleDescriptionEntity,
      PermissionDescriptionEntity,
    ]),
    // Imports AuthorizationModule for permission checking.
    AuthorizationModule,
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
    UsersModule,
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
