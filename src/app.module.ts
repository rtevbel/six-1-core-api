import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { AppRpcExceptionsFilter } from './common/filters/app-rpc-exceptions.filter';
import { APP_FILTER } from '@nestjs/core';
import { AppConfigService } from './common/services/app-config.service';
import {
  DEFAULT_ENVIRONMENT_FILE_NAME,
  DATABASE_SERVICE_TYPE,
  MYSQL_DATABASE_HOST_NAME_KEY,
  MYSQL_DATABASE_PORT_KEY,
  MYSQL_DATABASE_USER_NAME_KEY,
  MYSQL_DATABASE_PASSWORD_KEY,
  MYSQL_DATABASE_NAME_KEY,
} from './common/constants';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { TenantTypesModule } from './tenants/tenant_types/tenant_types.module';
import { TenantMetaModule } from './tenants/tenant_meta/tenant_meta.module';
import { TenantWorkingHoursModule } from './tenants/tenant_working_hours/tenant_working_hours.module';
import { TenantOffDaysModule } from './tenants//tenant_off_days/tenant_off_days.module';
import { TenantContactInfoModule } from './tenants/tenant_contact_info/tenant_contact_info.module';
import { TenantBillingInfoModule } from './tenants/tenant_billing_info/tenant_billing_info.module';
import { TenantSubscriptionsModule } from './tenants/tenant_subscriptions/tenant_subscriptions.module';
import { TenantConfigurationsModule } from './tenants/tenant_configurations/tenant_configurations.module';
import { TenantUsersModule } from './tenants/tenant_users/tenant_users.module';
import { TenantUserInvitationsModule } from './tenants/tenant_users/tenant_user_invitations/tenant_user_invitations.module';
import { TenantUserConfigurationsModule } from './tenants/tenant_users/tenant_user_configurations/tenant_user_configurations.module';
import { TenantUserWorkingHoursModule } from './tenants/tenant_users/tenant_user_working_hours/tenant_user_working_hours.module';
import { TenantUserOffDaysModule } from './tenants/tenant_users/tenant_user_off_days/tenant_user_off_days.module';
import { TenantsModule } from './tenants/tenants.module';

/**
 * Root module of the application.
 *
 * @version 0.0.1
 *
 * This module sets up configuration management, database connection,
 * and registers core modules like Users, Permissions, and Roles.
 */
@Module({
  imports: [
    /**
     * ConfigModule is used to load environment variables.
     * The `envFilePath` is determined based on the `NODE_ENV` environment variable.
     * This module is set as global to make configuration accessible throughout the application.
     */
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV
        ? '.env.' + process.env.NODE_ENV
        : DEFAULT_ENVIRONMENT_FILE_NAME,
      isGlobal: true,
    }),
    /**
     * TypeOrmModule is used for database connection setup.
     * Configuration is dynamically loaded using `ConfigService`.
     */
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: DATABASE_SERVICE_TYPE,
        host: configService.get(MYSQL_DATABASE_HOST_NAME_KEY),
        port: configService.get<number>(MYSQL_DATABASE_PORT_KEY),
        username: configService.get(MYSQL_DATABASE_USER_NAME_KEY),
        password: configService.get(MYSQL_DATABASE_PASSWORD_KEY),
        database: configService.get(MYSQL_DATABASE_NAME_KEY),
        entities: [],
        autoLoadEntities: true, // Automatically load entities from modules
        synchronize: false, // Set to false to prevent automatic schema synchronization in production
        logging: false, // Enable query logging
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
    UsersModule,
    EventsModule,
    RolesModule,
    PermissionsModule,
    SettingsModule,
    AuthModule,
    TenantsModule,
    TenantTypesModule,
    TenantMetaModule,
    TenantWorkingHoursModule,
    TenantOffDaysModule,
    TenantContactInfoModule,
    TenantBillingInfoModule,
    TenantSubscriptionsModule,
    TenantConfigurationsModule,
    TenantUsersModule,
    TenantUserInvitationsModule,
    TenantUserConfigurationsModule,
    TenantUserWorkingHoursModule,
    TenantUserOffDaysModule,
    /**
     * Importing feature modules that handle users, roles, and permissions.
     */
  ],
  controllers: [
    /**
     * The main application controller.
     */
    AppController,
  ],
  providers: [
    /**
     * Core application service provider.
     */
    AppService,
    /**
     * Provides a custom implementation of the ConfigService.
     */
    {
      provide: ConfigService,
      useClass: AppConfigService,
    },
    /**
     * Global exception filter for handling RPC exceptions.
     */
    {
      provide: APP_FILTER,
      useClass: AppRpcExceptionsFilter,
    },
  ],
})
export class AppModule {}
