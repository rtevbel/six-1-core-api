import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantContactInfoService } from './tenant_contact_info.service';
import { CreateTenantContactInfoDto } from './dto/create-tenant_contact_info.dto';
import { UpdateTenantContactInfoDto } from './dto/update-tenant_contact_info.dto';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_CONTACT_INFO_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_CONTACT_INFO_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_CONTACT_INFO_PATTERN,
  MICROSERVICE_UPDATE_TENANT_CONTACT_INFO_PATTERN,
  MICROSERVICE_REMOVE_TENANT_CONTACT_INFO_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

@Controller('tenant-contact-info')
export class TenantContactInfoController {
  constructor(
    private readonly tenantContactInfoService: TenantContactInfoService,
  ) {}

  /**
   * Handle the creation of tenant contact information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the contact information.
   * @param createTenantContactInfoDto - DTO containing contact information data.
   * @returns The created TenantContactInfoEntity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_CONTACT_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createContactInfo(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantContactInfoDto: CreateTenantContactInfoDto,
  ): Promise<TenantContactInfoEntity> {
    return this.tenantContactInfoService.create(
      requestingUserId,
      tenantId,
      createTenantContactInfoDto,
    );
  }

  /**
   * Handle fetching a specific contact information record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the contact information.
   * @param id - ID of the contact information record.
   * @returns The TenantContactInfoEntity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_CONTACT_INFO_PATTERN)
  async findOneContactInfo(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantContactInfoEntity> {
    return this.tenantContactInfoService.findOne(
      requestingUserId,
      tenantId,
      id,
    );
  }

  /**
   * Handle fetching contact information based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters to apply for fetching contact information.
   * @returns Array of TenantContactInfoEntity matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_CONTACT_INFO_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<Promise<FindAllResultInterface>> {
    return await this.tenantContactInfoService.findAllByFilters(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Handle fetching all contact information for a specific tenant ID.
   * @param tenantId - ID of the tenant associated with the contact information.
   * @returns Array of TenantContactInfoEntity.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantContactInfoEntity[]> {
    return this.tenantContactInfoService.findAllByTenantId(
      requestingUserId,
      tenantId,
    );
  }

  /**
   * Handle updating a specific contact information record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the contact information.
   * @param updateTenantContactInfoDto - DTO containing updated contact information data.
   * @returns UpdateResult indicating the outcome of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_CONTACT_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateContactInfo(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantContactInfoDto: UpdateTenantContactInfoDto,
  ): Promise<UpdateResult> {
    return this.tenantContactInfoService.update(
      requestingUserId,
      tenantId,
      updateTenantContactInfoDto.tenantContactId,
      updateTenantContactInfoDto,
    );
  }

  /**
   * Handle removing a specific contact information record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the contact information.
   * @param id - ID of the contact information record.
   * @returns DeleteResult indicating the outcome of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_CONTACT_INFO_PATTERN)
  async removeContactInfo(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantContactInfoService.remove(requestingUserId, tenantId, id);
  }
}
