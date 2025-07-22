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
  MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN,
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
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param createTenantUserWorkingHoursDto - Data transfer object containing working hours details.
   * @returns The created tenant user working hours entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserWorkingHours(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data')
    createTenantUserWorkingHoursDto: CreateTenantUserWorkingHoursDto,
  ): Promise<TenantUserWorkingHoursEntity> {
    return this.tenantUserWorkingHoursService.create(
      requestingUserId,
      createTenantUserWorkingHoursDto,
    );
  }

  /**
   * Retrieves a single tenant user working hours record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the working hours record to retrieve.
   * @returns The tenant user working hours entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_WORKING_HOURS_PATTERN)
  async findOneTenantUserWorkingHours(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserWorkingHoursEntity> {
    return this.tenantUserWorkingHoursService.findOne(
      requestingUserId,
      tenantUserId,
      id,
    );
  }

  /**
   * Retrieves all tenant user working hours based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param filtersDto - Filters for querying working hours.
   * @returns A list of tenant user working hours matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_WORKING_HOURS_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserWorkingHoursService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all working hours for a specific tenant user ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @returns A list of tenant user working hours entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN)
  async findAllByTenantUserId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
  ): Promise<TenantUserWorkingHoursEntity[]> {
    return this.tenantUserWorkingHoursService.findAllByTenantUserId(
      requestingUserId,
      tenantUserId,
    );
  }

  /**
   * Updates tenant user working hours information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param updateTenantUserWorkingHoursDto - Data transfer object containing updated working hours details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserWorkingHours(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data')
    updateTenantUserWorkingHoursDto: UpdateTenantUserWorkingHoursDto,
  ): Promise<UpdateResult> {
    return this.tenantUserWorkingHoursService.update(
      requestingUserId,
      tenantUserId,
      updateTenantUserWorkingHoursDto.tenantUserWorkingHourId,
      updateTenantUserWorkingHoursDto,
    );
  }

  /**
   * Deletes a tenant user working hours record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the working hours record to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_WORKING_HOURS_PATTERN)
  async removeTenantUserWorkingHours(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantUserId', ParseIntPipe) tenantUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserWorkingHoursService.remove(
      requestingUserId,
      tenantUserId,
      id,
    );
  }
}
