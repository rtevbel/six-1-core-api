import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AppRpcExceptionsFilter } from './common/filters/app-rpc-exceptions.filter';
import { APP_FILTER } from '@nestjs/core';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
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

/**
 * Root module of the application.
 * 
 * @version 1.0.0
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
      }),
      inject: [ConfigService],
    }),
    /**
     * Importing feature modules that handle users, roles, and permissions.
     */
    UsersModule,
    PermissionsModule,
    RolesModule,
  ],
  controllers: [
     /**
     * The main application controller.
     */
    AppController
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
