import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AppExceptionFilter } from './common/filters/AppException.filter';
import { APP_FILTER } from '@nestjs/core';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UserPasswordsService } from './user-passwords/user-passwords.service';
import { UserLoginTokensService } from './user-login-tokens/user-login-tokens.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV
        ? '.env.' + process.env.NODE_ENV
        : '.env.production',
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('USER_SERVICE_DB_HOST'),
        port: configService.get<number>('USER_SERVICE_DB_PORT'),
        username: configService.get('USER_SERVICE_DB_USERNAME'),
        password: configService.get('USER_SERVICE_DB_PASSWORD'),
        database: configService.get('USER_SERVICE_DB_DATABASE'),
        entities: [],
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    PermissionsModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
    UserPasswordsService,
    UserLoginTokensService,
  ],
})
export class AppModule {}
