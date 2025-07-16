import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
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

@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  /**
   * Handles the creation of a new user role.
   * @param userId - ID of the user making the request.
   * @param createUserRoleDto - Data transfer object containing user role details.
   * @returns The created user role entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createUserRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createUserRoleDto: CreateUserRoleDto,
  ): Promise<UserRoleEntity> {
    return this.userRolesService.create(userId, createUserRoleDto);
  }

  /**
   * Retrieves all user roles.
   * @param userId - ID of the user making the request.
   * @returns A list of user roles.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllUserRoles(
    @Payload('userId', ParseIntPipe) userId: number,
  ): Promise<UserRoleEntity[]> {
    return this.userRolesService.findAll(userId);
  }

  /**
   * Retrieves a single user role by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the user role to retrieve.
   * @returns The user role entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_ROLE_PATTERN)
  findOneUserRole(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<UserRoleEntity> {
    return this.userRolesService.findOne(userId, id);
  }

  /**
   * Updates an existing user role.
   * @param userId - ID of the user making the request.
   * @param updateUserRoleDto - Data transfer object containing updated user role details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateUserRole(
    @Payload('userId') userId: number,
    @Payload('data') updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<UpdateResult> {
    return this.userRolesService.update(
      userId,
      updateUserRoleDto.user_role_id,
      updateUserRoleDto,
    );
  }

  /**
   * Deletes a user role by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the user role to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_USER_ROLE_PATTERN)
  removeUserRole(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.userRolesService.remove(userId, id);
  }
}
