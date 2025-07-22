import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserMetaEntity } from './entities/tenant_user_meta.entity';
import { CreateTenantUserMetaDto } from './dto/create-tenant_user_meta.dto';
import { UpdateTenantUserMetaDto } from './dto/update-tenant_user_meta.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserMetaService {
  constructor(
    @InjectRepository(TenantUserMetaEntity)
    private readonly tenantUserMetaRepository: Repository<TenantUserMetaEntity>,
  ) {}

  /**
   * Creates a new tenant user metadata record.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserMetaDto - Data transfer object containing metadata details.
   * @returns The created metadata entity.
   */
  async create(
    requestingUserId: number,
    createTenantUserMetaDto: CreateTenantUserMetaDto,
  ): Promise<TenantUserMetaEntity> {
    return await this.tenantUserMetaRepository.save(
      this.tenantUserMetaRepository.create(createTenantUserMetaDto),
    );
  }

  /**
   * Retrieves all metadata for a specific tenant user ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @returns Array of metadata entities.
   */
  async findAllByTenantUserId(
    requestingUserId: number,
    tenantUserId: number,
  ): Promise<TenantUserMetaEntity[]> {
    const metadata = await this.tenantUserMetaRepository.find({
      where: { tenantUserId },
    });

    if (metadata.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return metadata;
  }

  /**
   * Retrieves tenant user metadata records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user metadata records.
   * @returns Object containing tenant user metadata records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantUserMetadata, total] =
      await this.tenantUserMetaRepository.findAndCount(findQuery);

    if (tenantUserMetadata.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return {
      tenantUserMetaRecords: tenantUserMetadata,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single metadata record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the metadata.
   * @returns The metadata entity.
   */
  async findOne(
    requestingUserId: number,
    id: number,
  ): Promise<TenantUserMetaEntity> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return metadata;
  }

  /**
   * Updates a metadata record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the metadata.
   * @param updateTenantUserMetaDto - Data transfer object containing updated metadata details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    id: number,
    updateTenantUserMetaDto: UpdateTenantUserMetaDto,
  ): Promise<UpdateResult> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return await this.tenantUserMetaRepository.update(
      id,
      updateTenantUserMetaDto,
    );
  }

  /**
   * Deletes a metadata record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the metadata.
   * @returns The result of the delete operation.
   */
  async remove(requestingUserId: number, id: number): Promise<DeleteResult> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return await this.tenantUserMetaRepository.delete(id);
  }

  /**
   * Builds a query object for filtering tenant user metadata records.
   * Applies LIKE queries on metadata fields.
   * @param filtersDto - Filters for querying tenant user metadata records.
   * @returns Query object for filtering.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { metaKey: Like(`%${filtersDto.search}%`) },
        { metaValue: Like(`%${filtersDto.search}%`) },
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
   * @param filtersDto - Filters for querying tenant user metadata records.
   * @param total - Total number of records matching the filters.
   * @returns Pagination details.
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
