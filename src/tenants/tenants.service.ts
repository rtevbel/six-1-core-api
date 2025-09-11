import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
//import { v4 as uuidv4 } from 'uuid';
import { time } from 'console';
 
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  /**
   * Creates a new tenant record.
   * @param userId - ID of the user creating the record.
   * @param createTenantDto - Data Transfer Object containing tenant details.
   * @returns The created TenantEntity.
   */
  async create(
    userId: number,
    createTenantDto: CreateTenantDto,
  ): Promise<TenantEntity> {
    // Generate a unique tenant identifier using UUID
    //createTenantDto.tenantIdentifier = `TENANT-${uuidv4()}`;
    // Generate a short unique identifier (e.g., timestamp in milliseconds)
    const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string
    createTenantDto.tenantIdentifier = `TENANT-${uniqueId}`;

    return await this.tenantRepository.save(
      this.tenantRepository.create(createTenantDto),
    );
  }

  /**
   * Retrieves all tenants with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of tenants and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenants, total] =
      await this.tenantRepository.findAndCount(findQuery);

    if (tenants.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantEntity.name,
        ),
      );
    }

    return {
      tenants,
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
   * Retrieves a single tenant by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the tenant to retrieve.
   * @returns The TenantEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOneByOrFail({
      tenantId: id,
    });

    if (!tenant) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TenantEntity.name),
      );
    }

    return tenant;
  }

  /**
   * Updates an existing tenant record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the tenant to update.
   * @param updateTenantDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateTenantDto: UpdateTenantDto,
  ): Promise<UpdateResult> {
    const tenant = await this.tenantRepository.findOneByOrFail({
      tenantId: id,
    });

    if (!tenant) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TenantEntity.name),
      );
    }

    return await this.tenantRepository.update(id, updateTenantDto);
  }

  /**
   * Deletes a tenant record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the tenant to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.tenantRepository.delete({ tenantId: id });
  }
}
