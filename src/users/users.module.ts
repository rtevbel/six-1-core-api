import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { UserMetaModule } from './user-meta/user-meta.module';
import { UserNotificationPreferencesModule } from './user-notification-preferences/user-notification-preferences.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { TenantEmailVerificationService } from './services/tenant-email-verification.service';
import { NotificationUrlBuilderService } from '../notifications/services/notification-url-builder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';

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
    UserMetaModule,
    UserNotificationPreferencesModule,
    UserRolesModule,
  ],

  // Specifies the controllers that handle incoming requests.
  controllers: [UserController],
  // Specifies the providers that contain the business logic.
  providers: [UserService, TenantEmailVerificationService, NotificationUrlBuilderService],
  exports: [UserService, TenantEmailVerificationService],
})
export class UsersModule {}
