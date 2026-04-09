import { Module } from '@nestjs/common';
import { UserNotificationPreferenceService } from './user-notification-preferences.service';
import { UserNotificationPreferenceController } from './user-notification-preferences.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationPreferenceEntity } from './entities/user-notification-preference.entity';

/**
 * UserNotificationPreferencesModule is responsible for managing
 * user notification preferences. It includes the controller and
 * service for handling related operations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the UserNotificationPreferenceEntity for TypeORM.
    TypeOrmModule.forFeature([UserNotificationPreferenceEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [UserNotificationPreferenceController],
  // Specifies the providers that contain the business logic.
  providers: [UserNotificationPreferenceService],
  // Exports the service to make it available for other modules.
  exports: [UserNotificationPreferenceService],
})
export class UserNotificationPreferencesModule {}
