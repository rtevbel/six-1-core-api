import { Injectable } from '@nestjs/common';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

/**
 * User roles service class.
 *
 * @version 0.0.1
 *
 * This service manages CRUD operations for user roles.
 */
@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  /**
   * Create a new user role.
   *
   * @param {number} requestingUserId - ID of the user making the request.
   * @param {number} userId - ID of the user associated with the role.
   * @param {CreateUserRoleDto} createUserRoleDto - DTO containing user role details.
   * @returns {Promise<UserRoleEntity>} - Promise that resolves to the created user role entity.
   */
  async create(
    requestingUserId: number,
    userId: number,
    createUserRoleDto: CreateUserRoleDto,
  ): Promise<UserRoleEntity> {
    createUserRoleDto = { ...createUserRoleDto, created_by: requestingUserId, user_id: userId };
    return await this.userRoleRepository.save(
      this.userRoleRepository.create(createUserRoleDto),
    );
  }

  /**
   * Find all user roles for a specific user.
   *
   * @param {number} requestingUserId - ID of the user making the request.
   * @param {number} userId - ID of the user whose roles are being retrieved.
   * @returns {Promise<UserRoleEntity[]>} - Promise that resolves to an array of user role entities.
   * @throws {RpcException} - Throws RpcException if no records found.
   */
  async findAll(
    requestingUserId: number,
    userId: number,
  ): Promise<UserRoleEntity[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { user_id: userId },
    });

    if (userRoles.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    return userRoles;
  }

  /**
   * Find a user role by ID.
   *
   * @param {number} requestingUserId - ID of the user making the request.
   * @param {number} userId - ID of the user associated with the role.
   * @param {number} id - ID of the user role being fetched.
   * @returns {Promise<UserRoleEntity>} - Promise that resolves to the user role entity.
   * @throws {RpcException} - Throws RpcException if no record found.
   */
  async findOne(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<UserRoleEntity> {
    const userRole = await this.userRoleRepository.findOneBy({
      user_role_id: id,
      user_id: userId,
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    return userRole;
  }

  /**
   * Update a user role.
   *
   * @param {number} requestingUserId - ID of the user making the request.
   * @param {number} userId - ID of the user associated with the role.
   * @param {number} id - ID of the user role being updated.
   * @param {UpdateUserRoleDto} updateUserRoleDto - DTO containing updated user role details.
   * @returns {Promise<UpdateResult>} - Promise that resolves to the update result.
   * @throws {RpcException} - Throws RpcException if no record found.
   */
  async update(
    requestingUserId: number,
    userId: number,
    id: number,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UpdateResult> {
    const userRole = await this.userRoleRepository.findOneBy({
      user_role_id: id,
      user_id: userId,
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    return await this.userRoleRepository.update(id, updateUserRoleDto);
  }

  /**
   * Remove a user role.
   *
   * @param {number} requestingUserId - ID of the user making the request.
   * @param {number} userId - ID of the user associated with the role.
   * @param {number} id - ID of the user role being deleted.
   * @returns {Promise<DeleteResult>} - Promise that resolves to the delete result.
   */
  async remove(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<DeleteResult> {
    const userRole = await this.userRoleRepository.findOneBy({
      user_role_id: id,
      user_id: userId,
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    return await this.userRoleRepository.delete({ user_role_id: id, user_id: userId });
  }
}