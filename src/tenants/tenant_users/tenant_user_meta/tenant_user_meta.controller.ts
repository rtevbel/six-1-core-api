import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserMetaService } from './tenant_user_meta.service';
import { CreateTenantUserMetaDto } from './dto/create-tenant_user_meta.dto';
import { UpdateTenantUserMetaDto } from './dto/update-tenant_user_meta.dto';
import { TenantUserMetaEntity } from './entities/tenant_user_meta.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_META_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_METAS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_META_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_META_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_META_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user metadata.
 */
@Controller('tenant-user-meta')
export class TenantUserMetaController {
  constructor(private readonly tenantUserMetaService: TenantUserMetaService) {}

  /**
   * Handles the creation of tenant user metadata.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param createTenantUserMetaDto - DTO containing metadata details.
   * @returns The created tenant user metadata entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserMeta(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTenantUserMetaDto: CreateTenantUserMetaDto,
  ): Promise<TenantUserMetaEntity> {
    return this.tenantUserMetaService.create(
      userId,
      tenantId,
      createTenantUserMetaDto,
    );
  }

  /**
   * Retrieves a single tenant user metadata record by ID.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the metadata record to retrieve.
   * @returns The tenant user metadata entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_META_PATTERN)
  async findOneTenantUserMeta(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserMetaEntity> {
    return this.tenantUserMetaService.findOne(
      userId,
      tenantId,
      tenantUserId,
      id,
    );
  }

  /**
   * Retrieves all tenant user metadata records based on filters.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying metadata records.
   * @returns A list of tenant user metadata matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_METAS_PATTERN)
  async findAllByFilters(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.tenantUserMetaService.findAllByFilter(
      userId,
      tenantId,
      filtersDto,
    );
  }

  /**
   * Updates tenant user metadata information.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param updateTenantUserMetaDto - DTO containing updated metadata details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserMeta(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data') updateTenantUserMetaDto: UpdateTenantUserMetaDto,
  ): Promise<UpdateResult> {
    return this.tenantUserMetaService.update(
      userId,
      tenantId,
      tenantUserId,
      updateTenantUserMetaDto.tenantUserMetaId,
      updateTenantUserMetaDto,
    );
  }

  /**
   * Deletes a tenant user metadata record by ID.
   * @param tenantId - ID of the tenant.
   * @param userId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the metadata record to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_META_PATTERN)
  async removeTenantUserMeta(
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserMetaService.remove(
      userId,
      tenantId,
      tenantUserId,
      id,
    );
  }
}
