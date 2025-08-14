import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserRoleService } from './tenant_user_roles.service';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import {FindAllResultInterface} from "./interfaces/findall-result.interface"

import {
  MICROSERVICE_CREATE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_ROLE_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_ROLE_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user roles.
 */
@Controller('tenant-user-roles')
export class TenantUserRoleController {
  constructor(private readonly tenantUserRoleService: TenantUserRoleService) {}

  /**
   * Handles the creation of a tenant user role.
   * @param userId - ID of the user making the request.
   * @param createTenantUserRoleDto - Data transfer object containing role details.
   * @returns The created tenant user role entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantUserRoleDto: CreateTenantUserRoleDto,
  ): Promise<TenantUserRoleEntity> {
    return this.tenantUserRoleService.create(
      userId,
      tenantId,
      createTenantUserRoleDto.tenantUserId,
      createTenantUserRoleDto,
    );
  }

  /**
   * Retrieves all tenant user roles based on filters.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param filtersDto - Filters for querying roles.
   * @returns A list of tenant user roles matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.tenantUserRoleService.findAll(userId, tenantId, filtersDto);
  }

  /**
   * Retrieves a single tenant user role by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the role to retrieve.
   * @returns The tenant user role entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_ROLE_PATTERN)
  async findOneTenantUserRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserRoleEntity> {
    return this.tenantUserRoleService.findOne(userId, tenantId, tenantUserId, id);
  }

  /**
   * Updates tenant user role information.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantUserRoleDto - Data transfer object containing updated role details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantUserRoleDto: UpdateTenantUserRoleDto,
  ): Promise<UpdateResult> {

    if (updateTenantUserRoleDto.tenantUserId === undefined) {
      throw new Error('tenantUserId is required');
    }
    
    return this.tenantUserRoleService.update(
      userId,
      tenantId,
      updateTenantUserRoleDto.tenantUserId,
      updateTenantUserRoleDto.tenantUserRoleId,
      updateTenantUserRoleDto,
    );
  }

  /**
   * Deletes a tenant user role by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_ROLE_PATTERN)
  async removeTenantUserRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserRoleService.remove(userId, tenantId, tenantUserId, id);
  }
}