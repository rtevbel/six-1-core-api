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
   * @param {number} userId - Authenticated user ID.
   * @param {CreateUserRoleDto} createUserRoleDto - DTO containing user role details.
   * @returns {Promise<UserRoleEntity>} - Promise that resolves to the created user role entity.
   */
  async create(
    userId: number,
    createUserRoleDto: CreateUserRoleDto,
  ): Promise<UserRoleEntity> {
    createUserRoleDto = { ...createUserRoleDto, created_by: userId };
    return await this.userRoleRepository.save(
      this.userRoleRepository.create(createUserRoleDto),
    );
  }

  /**
   * Find all user roles.
   *
   * @param {number} userId - Authenticated user ID.
   * @returns {Promise<UserRoleEntity[]>} - Promise that resolves to an array of user role entities.
   * @throws {RpcException} - Throws RpcException if no records found.
   */
  async findAll(userId: number): Promise<UserRoleEntity[]> {
    const userRoles = await this.userRoleRepository.find();

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
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - ID of the user role being fetched.
   * @returns {Promise<UserRoleEntity>} - Promise that resolves to the user role entity.
   * @throws {RpcException} - Throws RpcException if no record found.
   */
  async findOne(userId: number, id: number): Promise<UserRoleEntity> {
    const userRole = await this.userRoleRepository.findOneBy({
      user_role_id: id,
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
   * Find user roles by user ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @returns {Promise<UserRoleEntity[]>} - Promise that resolves to an array of user role entities for the given user ID.
   * @throws {RpcException} - Throws RpcException if no records found.
   */
  async findByUserId(userId: number): Promise<UserRoleEntity[]> {
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
   * Update a user role.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - ID of the user role being updated.
   * @param {UpdateUserRoleDto} updateUserRoleDto - DTO containing updated user role details.
   * @returns {Promise<UpdateResult>} - Promise that resolves to the update result.
   * @throws {RpcException} - Throws RpcException if no record found.
   */
  async update(
    userId: number,
    id: number,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UpdateResult> {
    const userRole = await this.userRoleRepository.findOneBy({
      user_role_id: id,
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    updateUserRoleDto = { ...updateUserRoleDto, ...{ updated_by: userId } };
    return await this.userRoleRepository.update(id, updateUserRoleDto);
  }

  /**
   * Remove a user role.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - ID of the user role being deleted.
   * @returns {Promise<DeleteResult>} - Promise that resolves to the delete result.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.userRoleRepository.delete({ user_role_id: id });
  }
}
