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
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';


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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantBillingInfoDto - DTO containing billing info details.
   * @returns The created TenantBillingInfoEntity.
   */
  async create(
    userId: number,
    createTenantBillingInfoDto: CreateTenantBillingInfoDto,
  ): Promise<TenantBillingInfoEntity> {
    createTenantBillingInfoDto.createdBy = userId;

    return await this.tenantBillingInfoRepository.save(
      this.tenantBillingInfoRepository.create(createTenantBillingInfoDto),
    );
  }
  /**
   * Retrieves billing info records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilter(
    userId: number,
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

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: billingInfoRecords,
      contactBillingInfoRecords: billingInfoRecords,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a specific billing info record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The TenantBillingInfoEntity record.
   */
  async findOne(
    userId: number,
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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @param updateTenantBillingInfoDto - DTO containing updated billing info details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
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

    updateTenantBillingInfoDto.updatedBy = userId;

    return await this.tenantBillingInfoRepository.update(
      id,
      updateTenantBillingInfoDto,
    );
  }

  /**
   * Deletes a specific billing info record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
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

    query.where = { tenantId: filtersDto.tenantId };

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
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
