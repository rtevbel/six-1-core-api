import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  /**
   * Creates a new user-role mapping.
   * @param requestingUserId - ID of the user making the request.
   * @param createUserRoleDto - Data Transfer Object containing user-role details.
   * @returns The created UserRoleEntity.
   */
  async create(requestingUserId: number, createUserRoleDto: CreateUserRoleDto): Promise<UserRoleEntity> {
    createUserRoleDto.createdBy = requestingUserId;

    return await this.userRoleRepository.save(
      this.userRoleRepository.create(createUserRoleDto),
    );
  }

  /**
   * Retrieves all user-role mappings.
   * @param requestingUserId - ID of the user making the request.
   * @returns List of UserRoleEntity records.
   */
  async findAll(requestingUserId: number): Promise<UserRoleEntity[]> {
    const userRoles = await this.userRoleRepository.find();

    if (userRoles.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          UserRoleEntity.name,
        ),
      );
    }

    return userRoles;
  }

  /**
   * Retrieves a single user-role mapping by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the user-role mapping to retrieve.
   * @returns The UserRoleEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(requestingUserId: number, id: number): Promise<UserRoleEntity> {
    const userRole = await this.userRoleRepository.findOneByOrFail({ userRoleId: id });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserRoleEntity.name),
      );
    }

    return userRole;
  }

  /**
   * Updates an existing user-role mapping.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the user-role mapping to update.
   * @param updateUserRoleDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    requestingUserId: number,
    id: number,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UpdateResult> {
    const userRole = await this.userRoleRepository.findOneByOrFail({ userRoleId: id });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserRoleEntity.name),
      );
    }

    return await this.userRoleRepository.update(id, updateUserRoleDto);
  }

  /**
   * Deletes a user-role mapping by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the user-role mapping to delete.
   * @returns The result of the delete operation.
   */
  async remove(requestingUserId: number, id: number): Promise<DeleteResult> {
    return await this.userRoleRepository.delete({ userRoleId: id });
  }
}