import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTypesService } from './tenant_types.service';
import { CreateTenantTypeDto } from './dto/create-tenant_type.dto';
import { UpdateTenantTypeDto } from './dto/update-tenant_type.dto';
import { FiltersDto } from './dto/filters.dto';
import { TenantTypeEntity } from './entities/tenant_type.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_TYPE_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_TYPE_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_TYPE_PATTERN,
  MICROSERVICE_UPDATE_TENANT_TYPE_PATTERN,
  MICROSERVICE_REMOVE_TENANT_TYPE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('tenant-types')
export class TenantTypesController {
  constructor(private readonly tenantTypesService: TenantTypesService) {}

  /**
   * Handles the creation of a new tenant type.
   * @param userId - ID of the user making the request.
   * @param createTenantTypeDto - Data transfer object containing tenant type details.
   * @returns The created tenant type entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_TYPE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createTenantType(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createTenantTypeDto: CreateTenantTypeDto,
  ): Promise<TenantTypeEntity> {
    return this.tenantTypesService.create(userId, createTenantTypeDto);
  }

  /**
   * Retrieves all tenant types based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant types.
   * @returns A list of tenant types matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_TYPE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllTenantTypes(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.tenantTypesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single tenant type by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the tenant type to retrieve.
   * @returns The tenant type entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_TYPE_PATTERN)
  findOneTenantType(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<TenantTypeEntity | NotFoundException> {
    return this.tenantTypesService.findOne(userId, id);
  }

  /**
   * Updates an existing tenant type.
   * @param userId - ID of the user making the request.
   * @param updateTenantTypeDto - Data transfer object containing updated tenant type details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_TYPE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateTenantType(
    @Payload('userId') userId: number,
    @Payload('data') updateTenantTypeDto: UpdateTenantTypeDto,
  ): Promise<UpdateResult> {
    return this.tenantTypesService.update(
      userId,
      updateTenantTypeDto.tenantTypeId,
      updateTenantTypeDto,
    );
  }

  /**
   * Deletes a tenant type by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the tenant type to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_TYPE_PATTERN)
  removeTenantType(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.tenantTypesService.remove(userId, id);
  }
}
