import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantMetaService } from './tenant_meta.service';
import { CreateTenantMetaDto } from './dto/create-tenant_meta.dto';
import { UpdateTenantMetaDto } from './dto/update-tenant_meta.dto';
import { TenantMetaEntity } from './entities/tenant_meta.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import {FiltersDto} from "./dto/filters.dto";
import {FindAllResultInterface} from "./interfaces/findall-result.interface";

import {
  MICROSERVICE_CREATE_TENANT_META_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_META_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_META_PATTERN,
  MICROSERVICE_UPDATE_TENANT_META_PATTERN,
  MICROSERVICE_REMOVE_TENANT_META_PATTERN,
  MICROSERVICE_FIND_META_VALUE_BY_TENANTID_AND_METAKEY_PATTERN,
} from './constants';

@Controller('tenant-meta')
export class TenantMetaController {
  constructor(private readonly tenantMetaService: TenantMetaService) {}

  /**
   * Handles the creation of a new tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param createTenantMetaDto - Data transfer object containing metadata details.
   * @returns The created tenant metadata entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createTenantMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTenantMetaDto: CreateTenantMetaDto,
  ): Promise<TenantMetaEntity> {
    return this.tenantMetaService.create(userId, createTenantMetaDto);
  }

  /**
   * Retrieves all tenant metadata records for a specific tenant.
   * @param userId - ID of the user making the request.
   * @returns Array of TenantMetaEntity matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllTenantMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.tenantMetaService.findAllByFilters(userId, filtersDto);
  }

  /**
   * Retrieves a single tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record.
   * @returns The tenant metadata entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_META_PATTERN)
  findOneTenantMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) tenantMetaId: number,
  ): Promise<TenantMetaEntity> {
    return this.tenantMetaService.findOne(userId, tenantMetaId);
  }

  /**
   * Updates an existing tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param updateTenantMetaDto - Data transfer object containing updated metadata details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateTenantMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateTenantMetaDto: UpdateTenantMetaDto,
  ): Promise<UpdateResult> {
    return this.tenantMetaService.update(
      userId,
      updateTenantMetaDto.tenantMetaId,
      updateTenantMetaDto,
    );
  }

  /**
   * Deletes a tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_META_PATTERN)
  removeTenantMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) tenantMetaId: number,
  ): Promise<DeleteResult> {
    return this.tenantMetaService.remove(userId, tenantMetaId);
  }

  /**
   * Finds the meta value for a specific tenant and meta key.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   */
  @MessagePattern(MICROSERVICE_FIND_META_VALUE_BY_TENANTID_AND_METAKEY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findMetaValue(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') payload: { tenantId: number; metaKey: string },
  ): Promise<string> {
    return this.tenantMetaService.findMetaValueByTenantIdAndMetaKey(
      userId,
      payload.tenantId,
      payload.metaKey,
    );
  }
}
