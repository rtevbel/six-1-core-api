import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantConfigurationsService } from './tenant_configurations.service';
import { CreateTenantConfigurationsDto } from './dto/create-tenant_configuration.dto';
import { UpdateTenantConfigurationsDto } from './dto/update-tenant_configuration.dto';
import { TenantConfigurationsEntity } from './entities/tenant_configuration.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
 MICROSERVICE_CREATE_TENANT_CONFIGURATION_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_CONFIGURATIONS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_CONFIGURATION_PATTERN,
  MICROSERVICE_UPDATE_TENANT_CONFIGURATION_PATTERN,
  MICROSERVICE_REMOVE_TENANT_CONFIGURATION_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

// Controller for handling tenant configuration-related microservice requests
@Controller('tenant-configuration')
export class TenantConfigurationsController {
  constructor(
    private readonly tenantConfigurationsService: TenantConfigurationsService,
  ) {}

  /**
   * Handles the creation of a new tenant configuration.
   * @param userId - ID of the user making the request
   * @param createTenantConfigurationsDto - Data for the new configuration
   * @returns The created tenant configuration entity
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createConfiguration(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    createTenantConfigurationsDto: CreateTenantConfigurationsDto,
  ): Promise<TenantConfigurationsEntity> {
    return this.tenantConfigurationsService.create(
      userId,
      createTenantConfigurationsDto,
    );
  }

  /**
   * Retrieves a specific tenant configuration by its ID.
   * @param userId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param id - ID of the configuration to retrieve
   * @returns The tenant configuration entity
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_CONFIGURATION_PATTERN)
  async findOneConfiguration(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantConfigurationsEntity> {
    return this.tenantConfigurationsService.findOne(
      userId,
      tenantId,
      id,
    );
  }

  /**
   * Retrieves all tenant configurations based on filters.
   * @param userId - ID of the user making the request
   * @param filtersDto - Filters for querying configurations
   * @returns A result object containing filtered configurations
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_CONFIGURATIONS_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantConfigurationsService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Updates an existing tenant configuration.
   * @param userId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param updateTenantConfigurationsDto - Data for updating the configuration
   * @returns The result of the update operation
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_CONFIGURATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateConfiguration(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data')
    updateTenantConfigurationsDto: UpdateTenantConfigurationsDto,
  ): Promise<UpdateResult> {
    return this.tenantConfigurationsService.update(
      userId,
      tenantId,
      updateTenantConfigurationsDto.tenantConfigId,
      updateTenantConfigurationsDto,
    );
  }

  /**
   * Deletes a tenant configuration by its ID.
   * @param userId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param id - ID of the configuration to delete
   * @returns The result of the delete operation
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_CONFIGURATION_PATTERN)
  async removeConfiguration(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantConfigurationsService.remove(
      userId,
      tenantId,
      id,
    );
  }
}
