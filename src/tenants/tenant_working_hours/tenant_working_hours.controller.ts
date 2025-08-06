import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantWorkingHoursService } from './tenant_working_hours.service';
import { CreateTenantWorkingHoursDto } from './dto/create-tenant_working_hour.dto';
import { UpdateTenantWorkingHoursDto } from './dto/update-tenant_working_hour.dto';
import { TenantWorkingHoursEntity } from './entities/tenant_working_hour.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

import {
MICROSERVICE_CREATE_TENANT_WORKING_HOURS_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_WORKING_HOURS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_WORKING_HOURS_PATTERN,
  MICROSERVICE_UPDATE_TENANT_WORKING_HOURS_PATTERN,
  MICROSERVICE_REMOVE_TENANT_WORKING_HOURS_PATTERN,
} from './constants';

@Controller('tenant-working-hours')
export class TenantWorkingHoursController {
  constructor(
    private readonly tenantWorkingHoursService: TenantWorkingHoursService,
  ) {}

  /**
   * Handle the creation of tenant working hours.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param createTenantWorkingHoursDto - DTO containing working hours data.
   * @returns The created TenantWorkingHoursEntity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantWorkingHoursDto: CreateTenantWorkingHoursDto,
  ): Promise<TenantWorkingHoursEntity> {
    return await this.tenantWorkingHoursService.create(
      userId,
      tenantId,
      createTenantWorkingHoursDto,
    );
  }

  /**
   * Handle fetching all working hours for a tenant.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @returns Array of TenantWorkingHoursEntity.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_WORKING_HOURS_PATTERN)
  async findAllWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantWorkingHoursEntity[]> {
    return await this.tenantWorkingHoursService.findAllByTenant(
      userId,
      tenantId,
    );
  }

  /**
   * Handle fetching a specific working hours record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param id - ID of the working hours record.
   * @returns The TenantWorkingHoursEntity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_WORKING_HOURS_PATTERN)
  async findOneWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantWorkingHoursEntity> {
    return await this.tenantWorkingHoursService.findOne(
      userId,
      tenantId,
      id,
    );
  }

  /**
   * Handle updating a specific working hours record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param updateTenantWorkingHoursDto - DTO containing updated working hours data.
   * @returns UpdateResult indicating the outcome of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_WORKING_HOURS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantWorkingHoursDto: UpdateTenantWorkingHoursDto,
  ): Promise<UpdateResult> {
    return await this.tenantWorkingHoursService.update(
      userId,
      tenantId,
      updateTenantWorkingHoursDto.tenantWorkingHourId,
      updateTenantWorkingHoursDto,
    );
  }

  /**
   * Handle removing a specific working hours record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param id - ID of the working hours record.
   * @returns DeleteResult indicating the outcome of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_WORKING_HOURS_PATTERN)
  async removeWorkingHours(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return await this.tenantWorkingHoursService.remove(
      userId,
      tenantId,
      id,
    );
  }
}
