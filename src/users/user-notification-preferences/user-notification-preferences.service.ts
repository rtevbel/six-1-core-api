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
   * @param createDto - Data Transfer Object containing preference details.
   * @returns The created UserNotificationPreferenceEntity.
   */
  async create(
    createDto: CreateUserNotificationPreferenceDto,
  ): Promise<UserNotificationPreferenceEntity> {
    // Ensure the DTO matches the entity structure
    const preference = this.preferenceRepository.create(createDto);

    // Save and return the created entity
    const savedPreference = await this.preferenceRepository.save(preference);

    // Ensure the return type matches the expected entity type
    if (!savedPreference.preferenceId) {
      throw new Error('Failed to create UserNotificationPreferenceEntity');
    }

    return savedPreference;
  }

  /**
   * Retrieves all user notification preferences.
   * @returns A list of UserNotificationPreference entities.
   */
  async findAll(): Promise<UserNotificationPreferenceEntity[]> {
    const preferences = await this.preferenceRepository.find();
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
   * @param id - ID of the preference to retrieve.
   * @returns The UserNotificationPreference entity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(id: string): Promise<UserNotificationPreferenceEntity> {
    try {
      return await this.preferenceRepository.findOneByOrFail({
        preferenceId: id,
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
   * @param id - ID of the preference to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    id: string,
    updateDto: UpdateUserNotificationPreferenceDto,
  ): Promise<UpdateResult> {
    const preference = await this.findOne(id);
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
   * @param id - ID of the preference to delete.
   * @returns The result of the delete operation.
   */
  async remove(id: string): Promise<DeleteResult> {
    const preference = await this.findOne(id);
    if (!preference) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          UserNotificationPreferenceEntity.name,
        ),
      );
    }
    return await this.preferenceRepository.delete({ preferenceId: id });
  }
}
