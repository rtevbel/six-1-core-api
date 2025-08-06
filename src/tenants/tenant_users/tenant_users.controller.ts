import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUsersService } from './tenant_users.service';
import { CreateTenantUserDto } from './dto/create-tenant_user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant_user.dto';
import { TenantUsersEntity } from './entities/tenant_user.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USERS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant users.
 */
@Controller('tenant-users')
export class TenantUsersController {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  /**
   * Handles the creation of a tenant user.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which the user is being created.
   * @param CreateTenantUserDto - Data transfer object containing user details.
   * @returns The created tenant user entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUser(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantUserDto: CreateTenantUserDto,
  ): Promise<TenantUsersEntity> {
    return this.tenantUsersService.create(
      userId,
      tenantId,
      createTenantUserDto,
    );
  }

  /**
   * Retrieves a single tenant user by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the user to retrieve.
   * @returns The tenant user entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_PATTERN)
  async findOneTenantUser(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUsersEntity> {
    return this.tenantUsersService.findOne(userId, tenantId, id);
  }

  /**
   * Retrieves all tenant users based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying users.
   * @returns A list of tenant users matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USERS_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUsersService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Retrieves all users for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns A list of tenant user entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantUsersEntity[]> {
    return this.tenantUsersService.findAllByTenantId(
      userId,
      tenantId,
    );
  }

  /**
   * Updates tenant user information.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantUserDto - Data transfer object containing updated user details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUser(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantUserDto: UpdateTenantUserDto,
  ): Promise<UpdateResult> {
    return this.tenantUsersService.update(
      userId,
      tenantId,
      updateTenantUserDto.tenantUserId,
      updateTenantUserDto,
    );
  }

  /**
   * Deletes a tenant user by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the user to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_PATTERN)
  async removeTenantUser(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUsersService.remove(userId, tenantId, id);
  }
}
