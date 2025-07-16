import { Controller, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserNotificationPreferenceService } from './user-notification-preferences.service';
import { CreateUserNotificationPreferenceDto } from './dto/create-user-notification-preference.dto';
import { UpdateUserNotificationPreferenceDto } from './dto/update-user-notification-preference.dto';
import { UserNotificationPreferenceEntity } from './entities/user-notification-preference.entity';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import {
  MICROSERVICE_CREATE_NOTIFICATION_PREFERENCE_PATTERN,
  MICROSERVICE_FIND_ALL_NOTIFICATION_PREFERENCE_PATTERN,
  MICROSERVICE_FIND_ONE_NOTIFICATION_PREFERENCE_PATTERN,
  MICROSERVICE_UPDATE_NOTIFICATION_PREFERENCE_PATTERN,
  MICROSERVICE_REMOVE_NOTIFICATION_PREFERENCE_PATTERN,
} from './constants';

/**
 * Controller for handling user notification preference operations.
 * This controller interacts with the UserNotificationPreferenceService to perform CRUD operations
 * and responds to microservice message patterns.
 */
@Controller('user_notification_preference')
export class UserNotificationPreferenceController {
  constructor(
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
  ) {}

  /**
   * Create a new user notification preference entry.
   * @param createDto - Data transfer object containing preference details.
   * @returns The created UserNotificationPreferenceEntity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_PREFERENCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createPreference(
    @Payload('data') createDto: CreateUserNotificationPreferenceDto,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.userNotificationPreferenceService.create(createDto);
  }

  /**
   * Retrieve all user notification preferences.
   * @returns An array of UserNotificationPreferenceEntity objects.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_PREFERENCE_PATTERN)
  findAllPreferences(): Promise<UserNotificationPreferenceEntity[]> {
    return this.userNotificationPreferenceService.findAll();
  }

  /**
   * Retrieve a single user notification preference by its ID.
   * @param id - ID of the preference to retrieve.
   * @returns The UserNotificationPreferenceEntity object or an exception if not found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_PREFERENCE_PATTERN)
  findOnePreference(
    @Payload('data') id: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.userNotificationPreferenceService.findOne(id);
  }

  /**
   * Update a user notification preference entry.
   * @param id - ID of the preference to update.
   * @param updateDto - Data transfer object containing updated preference details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_PREFERENCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updatePreference(
    @Payload('id') id: string,
    @Payload('data') updateDto: UpdateUserNotificationPreferenceDto,
  ): Promise<UpdateResult> {
    return this.userNotificationPreferenceService.update(id, updateDto);
  }

  /**
   * Delete a user notification preference entry.
   * @param id - ID of the preference to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_PREFERENCE_PATTERN)
  removePreference(@Payload('data') id: string): Promise<DeleteResult> {
    return this.userNotificationPreferenceService.remove(id);
  }
}
