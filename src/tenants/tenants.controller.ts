import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { FiltersDto } from './dto/filters.dto';
import { TenantEntity } from './entities/tenant.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RequirePermissions } from '../authorization/authorization.decorator';

import {
  MICROSERVICE_CREATE_TENANT_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_PATTERN,
  MICROSERVICE_UPDATE_TENANT_PATTERN,
  MICROSERVICE_REMOVE_TENANT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Handles the creation of a new tenant.
   * @param userId - ID of the user making the request.
   * @param createTenantDto - Data transfer object containing tenant details.
   * @returns The created tenant entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_PATTERN)
  @RequirePermissions('tenants.create')
  @UsePipes(AppRpcValidationPipe)
  createTenant(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTenantDto: CreateTenantDto,
  ): Promise<TenantEntity> {
    return this.tenantsService.create(userId, createTenantDto);
  }

  /**
   * Retrieves all tenants based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenants.
   * @returns A list of tenants matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_PATTERN)
  @RequirePermissions('tenants.read')
  @UsePipes(AppRpcValidationPipe)
  findAllTenants(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.tenantsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single tenant by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the tenant to retrieve.
   * @returns The tenant entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_PATTERN)
  @RequirePermissions('tenants.read')
  findOneTenant(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<TenantEntity | NotFoundException> {
    return this.tenantsService.findOne(userId, id);
  }

  /**
   * Updates an existing tenant.
   * @param userId - ID of the user making the request.
   * @param updateTenantDto - Data transfer object containing updated tenant details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_PATTERN)
  @RequirePermissions('tenants.update')
  @UsePipes(AppRpcValidationPipe)
  updateTenant(
    @Payload('userId') userId: number,
    @Payload('data') updateTenantDto: UpdateTenantDto,
  ): Promise<UpdateResult> {
    return this.tenantsService.update(
      userId,
      updateTenantDto.tenantId,
      updateTenantDto,
    );
  }

  /**
   * Deletes a tenant by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the tenant to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_PATTERN)
  @RequirePermissions('tenants.delete')
  removeTenant(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.tenantsService.remove(userId, id);
  }
}
