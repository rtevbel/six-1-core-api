import { Controller, UsePipes, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRoleEntity } from './entities/user-role.entity';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import {
  MICROSERVICE_CREATE_USER_ROLE_PATTERN,
  MICROSERVICE_FIND_ALL_USER_ROLE_PATTERN,
  MICROSERVICE_FIND_ONE_USER_ROLE_PATTERN,
  MICROSERVICE_UPDATE_USER_ROLE_PATTERN,
  MICROSERVICE_REMOVE_USER_ROLE_PATTERN,
} from './constants';

/**
 * Controller for handling user role operations.
 * This controller interacts with the UserRolesService to perform CRUD operations
 * and responds to microservice message patterns.
 * 
 * @version 0.0.1
 */
@Controller('user_roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  /**
   * Create a new user role.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user for whom the role is being created.
   * @param createDto - Data transfer object containing role details.
   * @returns The created UserRoleEntity.
   */
  @MessagePattern(MICROSERVICE_CREATE_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') createDto: CreateUserRoleDto,
  ): Promise<UserRoleEntity> {
    return await this.userRolesService.create(requestingUserId, user_id, createDto);
  }

  /**
   * Retrieve all user roles for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose roles are being retrieved.
   * @returns An array of UserRoleEntity objects.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_ROLE_PATTERN)
  async findAllRoles(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
  ): Promise<UserRoleEntity[]> {
    return await this.userRolesService.findAll(requestingUserId, user_id);
  }

  /**
   * Retrieve a single user role by its ID for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose role is being retrieved.
   * @param id - ID of the role to retrieve.
   * @returns The UserRoleEntity object or an exception if not found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_ROLE_PATTERN)
  async findOneRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') id: number,
  ): Promise<UserRoleEntity> {
    return await this.userRolesService.findOne(requestingUserId, user_id, id);
  }

  /**
   * Update a user role for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose role is being updated.
   * @param id - ID of the role to update.
   * @param updateDto - Data transfer object containing updated role details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('id') id: number,
    @Payload('data') updateDto: UpdateUserRoleDto,
  ): Promise<UpdateResult> {
    return await this.userRolesService.update(requestingUserId, user_id, id, updateDto);
  }

  /**
   * Delete a user role for a specific user.
   * @param requestingUserId - ID of the user making the request.
   * @param user_id - ID of the user whose role is being deleted.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_USER_ROLE_PATTERN)
  async removeRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('user_id', ParseIntPipe) user_id: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return await this.userRolesService.remove(requestingUserId, user_id, id);
  }
}