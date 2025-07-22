import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';
import { CreateTenantBillingInfoDto } from './dto/create-tenant_billing_info.dto';
import { UpdateTenantBillingInfoDto } from './dto/update-tenant_billing_info.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantBillingInfoService {
  constructor(
    @InjectRepository(TenantBillingInfoEntity)
    private readonly tenantBillingInfoRepository: Repository<TenantBillingInfoEntity>,
  ) {}

  /**
   * Creates a new tenant billing info record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantBillingInfoDto - DTO containing billing info details.
   * @returns The created TenantBillingInfoEntity.
   */
  async create(
    requestingUserId: number,
    tenantId: number,
    createTenantBillingInfoDto: CreateTenantBillingInfoDto,
  ): Promise<TenantBillingInfoEntity> {
    createTenantBillingInfoDto.createdBy = requestingUserId;
    createTenantBillingInfoDto.tenantId = tenantId;

    return await this.tenantBillingInfoRepository.save(
      this.tenantBillingInfoRepository.create(createTenantBillingInfoDto),
    );
  }

  /**
   * Retrieves all billing info records for a specific tenant.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns An array of TenantBillingInfoEntity records.
   */
  async findAllByTenantId(
    requestingUserId: number,
    tenantId: number,
  ): Promise<TenantBillingInfoEntity[]> {
    const billingInfoRecords = await this.tenantBillingInfoRepository.find({
      where: { tenantId },
    });

    if (billingInfoRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    return billingInfoRecords;
  }

  /**
   * Retrieves billing info records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [billingInfoRecords, total] =
      await this.tenantBillingInfoRepository.findAndCount(findQuery);

    if (billingInfoRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    return {
      contactBillingInfoInfoRecords: billingInfoRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a specific billing info record by ID and tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The TenantBillingInfoEntity record.
   */
  async findOne(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantBillingInfoEntity> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }
    return billingInfo;
  }

  /**
   * Updates a specific billing info record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @param updateTenantBillingInfoDto - DTO containing updated billing info details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantId: number,
    id: number,
    updateTenantBillingInfoDto: UpdateTenantBillingInfoDto,
  ): Promise<UpdateResult> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    updateTenantBillingInfoDto.updatedBy = requestingUserId;

    return await this.tenantBillingInfoRepository.update(
      id,
      updateTenantBillingInfoDto,
    );
  }

  /**
   * Deletes a specific billing info record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    return await this.tenantBillingInfoRepository.delete({
      tenantBillingId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering and pagination.
   * @param filtersDto - DTO containing filter and pagination options.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { billing_address: Like(`%${filtersDto.search}%`) },
        { tax_id: Like(`%${filtersDto.search}%`) },
        { currency: Like(`%${filtersDto.search}%`) },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds pagination metadata.
   * @param filtersDto - DTO containing pagination options.
   * @param total - Total number of records.
   * @returns Pagination metadata.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}
