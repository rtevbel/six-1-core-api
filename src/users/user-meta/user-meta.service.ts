import { Injectable } from '@nestjs/common';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMetaEntity } from './entities/user-meta.entity';
import { CreateUserMetaDto } from './dto/create-user-meta.dto';
import { UpdateUserMetaDto } from './dto/update-user-meta.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

/**
 * UserMetaService
 *
 * This service handles CRUD operations for user metadata.
 * It interacts with the `user_meta` table in the database.
 *
 * @version 0.0.1
 */
@Injectable()
export class UserMetaService {
  constructor(
    @InjectRepository(UserMetaEntity)
    private readonly userMetaRepository: Repository<UserMetaEntity>,
  ) {}

  /**
   * Creates a new user metadata record.
   *
   * @param userId - ID of the user associated with the metadata.
   * @param createUserMetaDto - DTO containing metadata details.
   * @returns The created UserMetaEntity.
   */
  async create(
    userId: number,
    createUserMetaDto: CreateUserMetaDto,
  ): Promise<UserMetaEntity> {
    createUserMetaDto.user_id = userId;
    const newMeta = this.userMetaRepository.create(createUserMetaDto);
    return this.userMetaRepository.save(newMeta);
  }

  /**
   * Retrieves all user metadata records for a specific user.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user whose metadata is being retrieved.
   * @returns An array of UserMetaEntity objects.
   * @throws RpcException if no records are found.
   */
  async findAll(
    requestingUserId: number,
    userId: number,
  ): Promise<UserMetaEntity[]> {
    const metas = await this.userMetaRepository.find({
      where: { user_id: userId },
    });
    if (metas.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return metas;
  }

  /**
   * Retrieves a single user metadata record by its ID.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata record to retrieve.
   * @returns The UserMetaEntity object.
   * @throws RpcException if the record is not found.
   */
  async findOne(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<UserMetaEntity> {
    const meta = await this.userMetaRepository.findOneBy({
      user_meta_id: id,
      user_id: userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return meta;
  }

  /**
   * Updates an existing user metadata record.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata record to update.
   * @param updateUserMetaDto - DTO containing updated metadata details.
   * @returns The result of the update operation.
   * @throws RpcException if the record is not found.
   */
  async update(
    requestingUserId: number,
    userId: number,
    id: number,
    updateUserMetaDto: UpdateUserMetaDto,
  ): Promise<UpdateResult> {
    const meta = await this.userMetaRepository.findOneBy({
      user_meta_id: id,
      user_id: userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return this.userMetaRepository.update(id, updateUserMetaDto);
  }

  /**
   * Deletes a user metadata record by its ID.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata record to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<DeleteResult> {
    const meta = await this.userMetaRepository.findOneBy({
      user_meta_id: id,
      user_id: userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return this.userMetaRepository.delete({ user_meta_id: id });
  }

  /**
   * Finds the meta value for a specific user and meta key.
   *
   * @param userId - ID of the user associated with the metadata.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   * @throws RpcException if no record is found.
   */
  async findMetaValueByUserIdAndMetaKey(
    userId: number,
    metaKey: string,
  ): Promise<string> {
    const meta = await this.userMetaRepository.findOne({
      where: { user_id: userId, meta_key: metaKey },
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return meta.meta_value;
  }
}
