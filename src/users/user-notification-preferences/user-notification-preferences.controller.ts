import { Controller, UsePipes, ParseIntPipe } from '@nestjs/common';
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
 * 
 * @version 0.0.1
 * 
 */
@Controller('user_notification_preference')
export class UserNotificationPreferenceController {
  constructor(
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
  ) {}

  /**
   * Create a new user notification preference entry.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user for whom the preference is being created.
   * @param createDto - Data transfer object containing preference details.
   * @returns The created UserNotificationPreferenceEntity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_PREFERENCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createPreference(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') createDto: CreateUserNotificationPreferenceDto,
  ): Promise<UserNotificationPreferenceEntity> {
    return await this.userNotificationPreferenceService.create(
      requestingUserId,
      user_id,
      createDto,
    );
  }

  /**
   * Retrieve all user notification preferences for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose preferences are being retrieved.
   * @returns An array of UserNotificationPreferenceEntity objects.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_PREFERENCE_PATTERN)
  async findAllPreferences(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
  ): Promise<UserNotificationPreferenceEntity[]> {
    return await this.userNotificationPreferenceService.findAll(requestingUserId, user_id);
  }

  /**
   * Retrieve a single user notification preference by its ID for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose preference is being retrieved.
   * @param id - ID of the preference to retrieve.
   * @returns The UserNotificationPreferenceEntity object or an exception if not found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_PREFERENCE_PATTERN)
  async findOnePreference(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') id: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return await this.userNotificationPreferenceService.findOne(requestingUserId, user_id, id);
  }

  /**
   * Update a user notification preference entry for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose preference is being updated.
   * @param id - ID of the preference to update.
   * @param updateDto - Data transfer object containing updated preference details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_PREFERENCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updatePreference(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('id') id: string,
    @Payload('data') updateDto: UpdateUserNotificationPreferenceDto,
  ): Promise<UpdateResult> {
    return await this.userNotificationPreferenceService.update(
      requestingUserId,
      user_id,
      id,
      updateDto,
    );
  }

  /**
   * Delete a user notification preference entry for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose preference is being deleted.
   * @param id - ID of the preference to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_PREFERENCE_PATTERN)
  async removePreference(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') id: string,
  ): Promise<DeleteResult> {
    return await this.userNotificationPreferenceService.remove(requestingUserId, user_id, id);
  }
}