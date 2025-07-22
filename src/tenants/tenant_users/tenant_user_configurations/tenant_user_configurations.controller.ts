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
  MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN,
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
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserConfigurationDto - Data transfer object containing configuration details.
   * @returns The created tenant user configuration entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserConfiguration(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data')
    createTenantUserConfigurationDto: CreateTenantUserConfigurationDto,
  ): Promise<TenantUserConfigurationsEntity> {
    return this.tenantUserConfigurationsService.create(
      requestingUserId,
      createTenantUserConfigurationDto,
    );
  }

  /**
   * Retrieves a single tenant user configuration by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the configuration to retrieve.
   * @returns The tenant user configuration entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_CONFIGURATION_PATTERN)
  async findOneTenantUserConfiguration(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserConfigurationsEntity> {
    return this.tenantUserConfigurationsService.findOne(requestingUserId, id);
  }

  /**
   * Retrieves all tenant user configurations based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying configurations.
   * @returns A list of tenant user configurations matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_CONFIGURATIONS_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserConfigurationsService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all configurations for a specific tenant user ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @returns A list of tenant user configuration entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN)
  async findAllByTenantUserId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
  ): Promise<TenantUserConfigurationsEntity[]> {
    return this.tenantUserConfigurationsService.findAllByTenantUserId(
      requestingUserId,
      tenantUserId,
    );
  }

  /**
   * Updates tenant user configuration information.
   * @param requestingUserId - ID of the user making the request.
   * @param updateTenantUserConfigurationDto - Data transfer object containing updated configuration details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserConfiguration(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data')
    updateTenantUserConfigurationDto: UpdateTenantUserConfigurationDto,
  ): Promise<UpdateResult> {
    return this.tenantUserConfigurationsService.update(
      requestingUserId,
      updateTenantUserConfigurationDto.tenantUserConfigId,
      updateTenantUserConfigurationDto,
    );
  }

  /**
   * Deletes a tenant user configuration by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the configuration to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_CONFIGURATION_PATTERN)
  async removeTenantUserConfiguration(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserConfigurationsService.remove(requestingUserId, id);
  }
}
