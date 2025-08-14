import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserConfigurationsService } from './tenant_user_configurations.service';
import { CreateTenantUserConfigurationDto } from './dto/create-tenant_user_configuration.dto';
import { UpdateTenantUserConfigurationDto } from './dto/update-tenant_user_configuration.dto';
import { TenantUserConfigurationsEntity } from './entities/tenant_user_configuration.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_CONFIGURATION_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_CONFIGURATIONS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_CONFIGURATION_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_CONFIGURATION_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_CONFIGURATION_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user configurations.
 */
@Controller('tenant-user-configurations')
export class TenantUserConfigurationsController {
  constructor(
    private readonly tenantUserConfigurationsService: TenantUserConfigurationsService,
  ) {}

  /**
   * Handles the creation of a tenant user configuration.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param createTenantUserConfigurationDto - Data transfer object containing configuration details.
   * @returns The created tenant user configuration entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserConfiguration(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    createTenantUserConfigurationDto: CreateTenantUserConfigurationDto,
  ): Promise<TenantUserConfigurationsEntity> {
    return this.tenantUserConfigurationsService.create(
      tenantId,
      userId,
      createTenantUserConfigurationDto,
    );
  }

  /**
   * Retrieves a single tenant user configuration by ID.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the configuration to retrieve.
   * @returns The tenant user configuration entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_CONFIGURATION_PATTERN)
  async findOneTenantUserConfiguration(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserConfigurationsEntity> {
    return this.tenantUserConfigurationsService.findOne(
      tenantId,
      userId,
      tenantUserId,
      id,
    );
  }

  /**
   * Retrieves all tenant user configurations based on filters.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param filtersDto - Filters for querying configurations.
   * @returns A list of tenant user configurations matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_CONFIGURATIONS_PATTERN)
  async findAllByFilter(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserConfigurationsService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Updates tenant user configuration information.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param updateTenantUserConfigurationDto - Data transfer object containing updated configuration details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserConfiguration(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data')
    updateTenantUserConfigurationDto: UpdateTenantUserConfigurationDto,
  ): Promise<UpdateResult> {
    return this.tenantUserConfigurationsService.update(
      tenantId,
      userId,
      tenantUserId,
      updateTenantUserConfigurationDto.tenantUserConfigId,
      updateTenantUserConfigurationDto,
    );
  }

  /**
   * Deletes a tenant user configuration by ID.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the configuration to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_CONFIGURATION_PATTERN)
  async removeTenantUserConfiguration(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserConfigurationsService.remove(
      tenantId,
      userId,
      tenantUserId,
      id,
    );
  }
}