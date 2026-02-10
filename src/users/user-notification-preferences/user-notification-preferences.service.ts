import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserNotificationPreferenceEntity } from './entities/user-notification-preference.entity';
import { CreateUserNotificationPreferenceDto } from './dto/create-user-notification-preference.dto';
import { UpdateUserNotificationPreferenceDto } from './dto/update-user-notification-preference.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class UserNotificationPreferenceService {
  constructor(
    @InjectRepository(UserNotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<UserNotificationPreferenceEntity>,
  ) {}

  /**
   * Creates a new user notification preference record.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user associated with the preference.
   * @param createDto - Data Transfer Object containing preference details.
   * @returns The created UserNotificationPreferenceEntity.
   */
  async create(
    requestingUserId: number,
    user_id: number,
    createDto: CreateUserNotificationPreferenceDto,
  ): Promise<UserNotificationPreferenceEntity> {
    createDto.userId = user_id; // Associate the preference with the specified user
    const preference = this.preferenceRepository.create(createDto);
    const savedPreference = await this.preferenceRepository.save(preference);

    if (!savedPreference.preferenceId) {
      throw new Error('Failed to create UserNotificationPreferenceEntity');
    }

    return savedPreference;
  }

  /**
   * Retrieves all user notification preferences for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose preferences are being retrieved.
   * @returns A list of UserNotificationPreference entities.
   */
  async findAll(
    requestingUserId: number,
    user_id: number,
  ): Promise<UserNotificationPreferenceEntity[]> {
    const preferences = await this.preferenceRepository.find({
      where: { userId: user_id },
    });
    if (preferences.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          UserNotificationPreferenceEntity.name,
        ),
      );
    }
    return preferences;
  }

  /**
   * Retrieves a single user notification preference by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user associated with the preference.
   * @param id - ID of the preference to retrieve.
   * @returns The UserNotificationPreference entity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    requestingUserId: number,
    user_id: number,
    id: string,
  ): Promise<UserNotificationPreferenceEntity> {
    try {
      return await this.preferenceRepository.findOneByOrFail({
        preferenceId: id,
        userId: user_id,
      });
    } catch (error) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          UserNotificationPreferenceEntity.name,
        ),
      );
    }
  }

  /**
   * Updates an existing user notification preference record.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user associated with the preference.
   * @param id - ID of the preference to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    requestingUserId: number,
    user_id: number,
    id: string,
    updateDto: UpdateUserNotificationPreferenceDto,
  ): Promise<UpdateResult> {
    const preference = await this.findOne(requestingUserId, user_id, id);
    if (!preference) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          UserNotificationPreferenceEntity.name,
        ),
      );
    }
    return await this.preferenceRepository.update(id, updateDto);
  }

  /**
   * Deletes a user notification preference record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user associated with the preference.
   * @param id - ID of the preference to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    user_id: number,
    id: string,
  ): Promise<DeleteResult> {
    const preference = await this.findOne(requestingUserId, user_id, id);
    if (!preference) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          UserNotificationPreferenceEntity.name,
        ),
      );
    }
    return await this.preferenceRepository.delete({
      preferenceId: id,
      userId: user_id,
    });
  }

  /**
   * Checks whether a user has enabled a specific channel.
   * @param userId - ID of the user to check.
   * @param channelId - ID of the channel.
   * @returns True if enabled, false otherwise.
   */
  async isChannelEnabled(userId: number, channelId: number): Promise<boolean> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId, channelId },
    });

    if (!preference) {
      return true;
    }

    return Boolean(preference.isEnabled);
  }
}
