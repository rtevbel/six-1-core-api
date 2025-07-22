import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserOffDaysService } from './tenant_user_off_days.service';
import { CreateTenantUserOffDayDto } from './dto/create-tenant_user_off_day.dto';
import { UpdateTenantUserOffDayDto } from './dto/update-tenant_user_off_day.dto';
import { TenantUserOffDaysEntity } from './entities/tenant_user_off_day.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_OFF_DAY_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_OFF_DAYS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_OFF_DAY_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_OFF_DAY_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_OFF_DAY_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_USER_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user off days.
 */
@Controller('tenant-user-off-days')
export class TenantUserOffDaysController {
  constructor(
    private readonly tenantUserOffDaysService: TenantUserOffDaysService,
  ) {}

  /**
   * Handles the creation of a tenant user off day.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserOffDayDto - Data transfer object containing off day details.
   * @returns The created tenant user off day entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_OFF_DAY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserOffDay(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') createTenantUserOffDayDto: CreateTenantUserOffDayDto,
  ): Promise<TenantUserOffDaysEntity> {
    return this.tenantUserOffDaysService.create(
      requestingUserId,
      createTenantUserOffDayDto,
    );
  }

  /**
   * Retrieves a single tenant user off day by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the off day to retrieve.
   * @returns The tenant user off day entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_OFF_DAY_PATTERN)
  async findOneTenantUserOffDay(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserOffDaysEntity> {
    return this.tenantUserOffDaysService.findOne(requestingUserId, id);
  }

  /**
   * Retrieves all tenant user off days based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying off days.
   * @returns A list of tenant user off days matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_OFF_DAYS_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserOffDaysService.findAllByFilter(
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
  ): Promise<TenantUserOffDaysEntity[]> {
    return await this.tenantUserOffDaysService.findAllByTenantUserId(
      requestingUserId,
      tenantUserId,
    );
  }

  /**
   * Updates tenant user off day information.
   * @param requestingUserId - ID of the user making the request.
   * @param updateTenantUserOffDayDto - Data transfer object containing updated off day details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_OFF_DAY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserOffDay(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') updateTenantUserOffDayDto: UpdateTenantUserOffDayDto,
  ): Promise<UpdateResult> {
    return this.tenantUserOffDaysService.update(
      requestingUserId,
      updateTenantUserOffDayDto.tenantUserOffDayId,
      updateTenantUserOffDayDto,
    );
  }

  /**
   * Deletes a tenant user off day by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the off day to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_OFF_DAY_PATTERN)
  async removeTenantUserOffDay(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserOffDaysService.remove(requestingUserId, id);
  }
}
