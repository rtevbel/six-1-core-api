import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';
import { CreateTenantContactInfoDto } from './dto/create-tenant_contact_info.dto';
import { UpdateTenantContactInfoDto } from './dto/update-tenant_contact_info.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantContactInfoService {
  constructor(
    @InjectRepository(TenantContactInfoEntity)
    private readonly tenantContactInfoRepository: Repository<TenantContactInfoEntity>,
  ) {}

  /**
   * Creates a new tenant contact information record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantContactInfoDto - Data transfer object containing the contact info details.
   * @returns The created TenantContactInfoEntity.
   */
  async create(
    requestingUserId: number,
    tenantId: number,
    createTenantContactInfoDto: CreateTenantContactInfoDto,
  ): Promise<TenantContactInfoEntity> {
    createTenantContactInfoDto.createdBy = requestingUserId;
    createTenantContactInfoDto.tenantId = tenantId;

    return await this.tenantContactInfoRepository.save(
      this.tenantContactInfoRepository.create(createTenantContactInfoDto),
    );
  }

  /**
   * Retrieves all contact information records for a specific tenant.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns An array of TenantContactInfoEntity records.
   */
  async findAllByTenantId(
    requestingUserId: number,
    tenantId: number,
  ): Promise<TenantContactInfoEntity[]> {
    const contactInfoRecords = await this.tenantContactInfoRepository.find({
      where: { tenantId },
    });

    if (contactInfoRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    return contactInfoRecords;
  }

  /**
   * Retrieves contact information records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilters(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [contactInfoRecords, total] =
      await this.tenantContactInfoRepository.findAndCount(findQuery);

    if (contactInfoRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    return {
      contactInfoRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a specific contact information record by ID and tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @returns The TenantContactInfoEntity record.
   */
  async findOne(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantContactInfoEntity> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }
    return contactInfo;
  }

  /**
   * Updates a specific contact information record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @param updateTenantContactInfoDto - Data transfer object containing updated contact info details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantId: number,
    id: number,
    updateTenantContactInfoDto: UpdateTenantContactInfoDto,
  ): Promise<UpdateResult> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    updateTenantContactInfoDto.updatedBy = requestingUserId;

    return await this.tenantContactInfoRepository.update(
      id,
      updateTenantContactInfoDto,
    );
  }

  /**
   * Deletes a specific contact information record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    return await this.tenantContactInfoRepository.delete({
      tenantContactId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering and sorting records.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { phone: Like(`%${filtersDto.search}%`) },
        { email: Like(`%${filtersDto.search}%`) },
        { address: Like(`%${filtersDto.search}%`) },
        { postal_code: Like(`%${filtersDto.search}%`) },
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
   * Builds pagination details for the filtered records.
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records.
   * @returns An object containing pagination details.
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
