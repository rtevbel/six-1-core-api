import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserRoleService } from './tenant_user_roles.service';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

import {
  MICROSERVICE_CREATE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_ROLE_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user roles.
 */
@Controller('tenant-user-role')
export class TenantUserRoleController {
  constructor(private readonly tenantUserRoleService: TenantUserRoleService) {}

  /**
   * Handles the creation of tenant user roles.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserRoleDto - Data transfer object containing user role details.
   * @returns The created tenant user role entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createUserRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') createTenantUserRoleDto: CreateTenantUserRoleDto,
  ): Promise<TenantUserRoleEntity> {
    return this.tenantUserRoleService.create(requestingUserId, createTenantUserRoleDto);
  }

  /**
   * Retrieves all tenant user roles.
   * @param requestingUserId - ID of the user making the request.
   * @returns A list of tenant user role entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_ROLE_PATTERN)
  async findAllUserRoles(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
  ): Promise<TenantUserRoleEntity[]> {
    return this.tenantUserRoleService.findAll(requestingUserId);
  }

  /**
   * Retrieves a single tenant user role by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the user role to retrieve.
   * @returns The tenant user role entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_ROLE_PATTERN)
  async findOneUserRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserRoleEntity> {
    return this.tenantUserRoleService.findOne(requestingUserId, id);
  }

  /**
   * Updates tenant user roles.
   * @param requestingUserId - ID of the user making the request.
   * @param updateTenantUserRoleDto - Data transfer object containing updated user role details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateUserRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') updateTenantUserRoleDto: UpdateTenantUserRoleDto,
  ): Promise<UpdateResult> {
    return this.tenantUserRoleService.update(
      requestingUserId,
      updateTenantUserRoleDto.tenantUserRoleId,
      updateTenantUserRoleDto,
    );
  }

  /**
   * Deletes tenant user roles by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the user role to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_ROLE_PATTERN)
  async removeUserRole(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserRoleService.remove(requestingUserId, id);
  }
}