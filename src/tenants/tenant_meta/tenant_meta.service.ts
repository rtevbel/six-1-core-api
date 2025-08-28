import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantMetaEntity } from './entities/tenant_meta.entity';
import { CreateTenantMetaDto } from './dto/create-tenant_meta.dto';
import { UpdateTenantMetaDto } from './dto/update-tenant_meta.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantMetaService {
  constructor(
    @InjectRepository(TenantMetaEntity)
    private readonly tenantMetaRepository: Repository<TenantMetaEntity>,
  ) {}

  /**
   * Creates a new tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param createTenantMetaDto - Data Transfer Object containing metadata details.
   * @returns The created TenantMetaEntity.
   */
  async create(
    userId: number,
    createTenantMetaDto: CreateTenantMetaDto,
  ): Promise<TenantMetaEntity> {
    console.log(createTenantMetaDto, 'createTenantMetaDto');

    const newMeta = this.tenantMetaRepository.create(createTenantMetaDto);
    return this.tenantMetaRepository.save(newMeta);
  }

  /**
   * Retrieves all tenant metadata records for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   * @throws RpcException if no records are found.
   */
  async findAllByFilters(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantMetaRecords, total] =
      await this.tenantMetaRepository.findAndCount(findQuery);

    if (tenantMetaRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }
    return {
      tenantMetaRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record.
   * @returns The TenantMetaEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    tenantMetaId: number,
  ): Promise<TenantMetaEntity> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return tenantMeta;
  }

  /**
   * Updates an existing tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to update.
   * @param updateTenantMetaDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    tenantMetaId: number,
    updateTenantMetaDto: UpdateTenantMetaDto,
  ): Promise<UpdateResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }
    return this.tenantMetaRepository.update(tenantMetaId, updateTenantMetaDto);
  }

  /**
   * Deletes a tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, tenantMetaId: number): Promise<DeleteResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return this.tenantMetaRepository.delete({ tenantMetaId });
  }

  /**
   * Finds the meta value for a specific tenant and meta key.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the metadata.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   * @throws RpcException if no record is found.
   */
  async findMetaValueByTenantIdAndMetaKey(
    userId: number,
    tenantId: number,
    metaKey: string,
  ): Promise<string> {
    const meta = await this.tenantMetaRepository.findOne({
      where: { tenantId, metaKey: metaKey },
    });

    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return meta.metaValue;
  }

  /**
   * Builds a query object for filtering and sorting records.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Ensure tenantId is always included in the query
    query.where = { tenantId: filtersDto.tenantId };

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
