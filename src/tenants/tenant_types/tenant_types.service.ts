import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantTypeEntity } from './entities/tenant_type.entity';
import { CreateTenantTypeDto } from './dto/create-tenant_type.dto';
import { UpdateTenantTypeDto } from './dto/update-tenant_type.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantTypesService {
  constructor(
    @InjectRepository(TenantTypeEntity)
    private readonly tenantTypeRepository: Repository<TenantTypeEntity>,
  ) {}

  /**
   * Creates a new tenant type record.
   * @param userId - ID of the user creating the record.
   * @param createTenantTypeDto - Data Transfer Object containing tenant type details.
   * @returns The created TenantTypeEntity.
   */
  async create(
    userId: number,
    createTenantTypeDto: CreateTenantTypeDto,
  ): Promise<TenantTypeEntity> {
    return await this.tenantTypeRepository.save(
      this.tenantTypeRepository.create(createTenantTypeDto),
    );
  }

  /**
   * Retrieves all tenant types with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of tenant types and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantTypes, total] =
      await this.tenantTypeRepository.findAndCount(findQuery);

    if (tenantTypes.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    return {
      tenantTypes,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [{ name: Like(`%${filtersDto.search}%`) }];
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

  /**
   * Retrieves a single tenant type by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the tenant type to retrieve.
   * @returns The TenantTypeEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TenantTypeEntity> {
    const tenantType = await this.tenantTypeRepository.findOneByOrFail({
      tenantTypeId: id,
    });

    if (!tenantType) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    return tenantType;
  }

  /**
   * Updates an existing tenant type record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the tenant type to update.
   * @param updateTenantTypeDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateTenantTypeDto: UpdateTenantTypeDto,
  ): Promise<UpdateResult> {
    const tenantType = await this.tenantTypeRepository.findOneByOrFail({
      tenantTypeId: id,
    });

    if (!tenantType) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    return await this.tenantTypeRepository.update(id, updateTenantTypeDto);
  }

  /**
   * Deletes a tenant type record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the tenant type to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.tenantTypeRepository.delete({ tenantTypeId: id });
  }
}
