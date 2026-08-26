import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserWorkingHoursService } from './tenant_user_working_hours.service';
import { CreateTenantUserWorkingHoursDto } from './dto/create-tenant_user_working_hour.dto';
import { UpdateTenantUserWorkingHoursDto } from './dto/update-tenant_user_working_hour.dto';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_WORKING_HOURS_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_WORKING_HOURS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_WORKING_HOURS_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_WORKING_HOURS_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_WORKING_HOURS_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user working hours.
 */
@Controller('tenant-user-working-hours')
export class TenantUserWorkingHoursController {
  constructor(
    private readonly tenantUserWorkingHoursService: TenantUserWorkingHoursService,
  ) {}

  /**
   * Handles the creation of tenant user working hours.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param createTenantUserWorkingHoursDto - Data transfer object containing working hours details.
   * @returns The created tenant user working hours entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data')
    createTenantUserWorkingHoursDto: CreateTenantUserWorkingHoursDto,
  ): Promise<TenantUserWorkingHoursEntity> {
    return this.tenantUserWorkingHoursService.create(
      userId,
      tenantId,
      createTenantUserWorkingHoursDto,
    );
  }

  /**
   * Retrieves a single tenant user working hours by ID.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the working hours to retrieve.
   * @returns The tenant user working hours entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_WORKING_HOURS_PATTERN)
  async findOneTenantUserWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserWorkingHoursEntity> {
    return this.tenantUserWorkingHoursService.findOne(
      userId,
      tenantId,
      tenantUserId,
      id,
    );
  }

  /**
   * Retrieves all tenant user working hours based on filters.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param filtersDto - Filters for querying working hours.
   * @returns A list of tenant user working hours matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_WORKING_HOURS_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserWorkingHoursService.findAllByFilter(
      userId,
      tenantId,
      filtersDto,
    );
  }

  /**
   * Updates tenant user working hours information.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param updateTenantUserWorkingHoursDto - Data transfer object containing updated working hours details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data')
    updateTenantUserWorkingHoursDto: UpdateTenantUserWorkingHoursDto,
  ): Promise<UpdateResult> {
    return this.tenantUserWorkingHoursService.update(
      userId,
      tenantId,
      tenantUserId,
      Number(
        updateTenantUserWorkingHoursDto.tenantUserWorkingHourId ??
          (updateTenantUserWorkingHoursDto as { id?: number }).id,
      ),
      updateTenantUserWorkingHoursDto,
    );
  }

  /**
   * Deletes tenant user working hours by ID.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the working hours to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_WORKING_HOURS_PATTERN)
  async removeTenantUserWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserWorkingHoursService.remove(
      userId,
      tenantId,
      tenantUserId,
      id,
    );
  }
}
