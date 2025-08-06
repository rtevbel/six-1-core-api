import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantOffDaysService } from './tenant_off_days.service';
import { CreateTenantOffDaysDto } from './dto/create-tenant_off_day.dto';
import { UpdateTenantOffDaysDto } from './dto/update-tenant_off_day.dto';
import { TenantOffDaysEntity } from './entities/tenant_off_day.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_OFF_DAYS_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_OFF_DAYS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_OFF_DAYS_PATTERN,
  MICROSERVICE_UPDATE_TENANT_OFF_DAYS_PATTERN,
  MICROSERVICE_REMOVE_TENANT_OFF_DAYS_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant off-days.
 */
@Controller('tenant-off-days')
export class TenantOffDaysController {
  constructor(private readonly tenantOffDaysService: TenantOffDaysService) {}

  /**
   * Handles the creation of tenant off-days.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which off-days are being created.
   * @param createTenantOffDaysDto - Data transfer object containing off-days details.
   * @returns The created tenant off-days entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_OFF_DAYS_PATTERN)
  async createOffDays(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantOffDaysDto: CreateTenantOffDaysDto,
  ): Promise<TenantOffDaysEntity> {
    return this.tenantOffDaysService.create(userId, tenantId, createTenantOffDaysDto);
  }

  /**
   * Retrieves a single tenant off-day by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the off-day to retrieve.
   * @returns The tenant off-day entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_OFF_DAYS_PATTERN)
  async findOneOffDay(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantOffDaysEntity> {
    return this.tenantOffDaysService.findOne(userId, tenantId, id);
  }

  /**
   * Retrieves all tenant off-days based on filters.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param filtersDto - Filters for querying off-days.
   * @returns A list of tenant off-days matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_OFF_DAYS_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.tenantOffDaysService.findAllByFilter(userId, filtersDto);
  }

  /**
   * Retrieves all off-days for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns A list of tenant off-days entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantOffDaysEntity[]> {
    return this.tenantOffDaysService.findAllByTenantId(userId, tenantId);
  }

  /**
   * Updates tenant off-days.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantOffDaysDto - Data transfer object containing updated off-days details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_OFF_DAYS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateOffDays(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantOffDaysDto: UpdateTenantOffDaysDto,
  ): Promise<UpdateResult> {
    return this.tenantOffDaysService.update(
      userId,
      tenantId,
      updateTenantOffDaysDto.tenantOffDayId,
      updateTenantOffDaysDto,
    );
  }
  
  /**
   * Deletes tenant off-days by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the off-day to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_OFF_DAYS_PATTERN)
  async removeOffDays(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantOffDaysService.remove(userId, tenantId, id);
  }
}