import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantBillingInfoService } from './tenant_billing_info.service';
import { CreateTenantBillingInfoDto } from './dto/create-tenant_billing_info.dto';
import { UpdateTenantBillingInfoDto } from './dto/update-tenant_billing_info.dto';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_BILLING_INFO_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_BILLING_INFO_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_BILLING_INFO_PATTERN,
  MICROSERVICE_UPDATE_TENANT_BILLING_INFO_PATTERN,
  MICROSERVICE_REMOVE_TENANT_BILLING_INFO_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant billing information.
 */
@Controller('tenant-billing-info')
export class TenantBillingInfoController {
  constructor(
    private readonly tenantBillingInfoService: TenantBillingInfoService,
  ) {}

  /**
   * Handles the creation of tenant billing information.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which billing info is being created.
   * @param createTenantBillingInfoDto - Data transfer object containing billing info details.
   * @returns The created tenant billing info entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_BILLING_INFO_PATTERN)
  //@UsePipes(AppRpcValidationPipe)
  async createBillingInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTenantBillingInfoDto: CreateTenantBillingInfoDto,
  ): Promise<TenantBillingInfoEntity> {
    console.log(createTenantBillingInfoDto,'createTenantBillingInfoDto');
    return this.tenantBillingInfoService.create(
      userId,
      createTenantBillingInfoDto,
    );
  }

  /**
   * Retrieves a single tenant billing information by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info to retrieve.
   * @returns The tenant billing info entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_BILLING_INFO_PATTERN)
  async findOneBillingInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantBillingInfoEntity> {
    return this.tenantBillingInfoService.findOne(
      userId,
      tenantId,
      id,
    );
  }

  /**
   * Retrieves all tenant billing information based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying billing information.
   * @returns A list of tenant billing information matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_BILLING_INFO_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantBillingInfoService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Retrieves all billing information for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns A list of tenant billing information entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantBillingInfoEntity[]> {
    return this.tenantBillingInfoService.findAllByTenantId(
      userId,
      tenantId,
    );
  }

  /**
   * Updates tenant billing information.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantBillingInfoDto - Data transfer object containing updated billing info details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_BILLING_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateBillingInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantBillingInfoDto: UpdateTenantBillingInfoDto,
  ): Promise<UpdateResult> {
    return this.tenantBillingInfoService.update(
      userId,
      tenantId,
      updateTenantBillingInfoDto.tenantBillingId,
      updateTenantBillingInfoDto,
    );
  }

  /**
   * Deletes tenant billing information by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_BILLING_INFO_PATTERN)
  async removeBillingInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantBillingInfoService.remove(userId, tenantId, id);
  }
}
