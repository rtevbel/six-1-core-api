import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUsersEntity } from './entities/tenant_user.entity';
import { CreateTenantUserDto } from './dto/create-tenant_user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant_user.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantUsersService {
  constructor(
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
  ) {}

  /**
   * Creates a new tenant user record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param CreateTenantUserDto - Data transfer object containing tenant user details.
   * @returns The created tenant user entity.
   */
  async create(
    requestingUserId: number,
    tenantId: number,
    createTenantUsersDto: CreateTenantUserDto,
  ): Promise<TenantUsersEntity> {
    createTenantUsersDto.createdBy = requestingUserId;
    createTenantUsersDto.tenantId = tenantId;

    return await this.tenantUsersRepository.save(
      this.tenantUsersRepository.create(createTenantUsersDto),
    );
  }

  /**
   * Retrieves all tenant user records for a specific tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns Array of tenant user entities.
   */
  async findAllByTenantId(
    requestingUserId: number,
    tenantId: number,
  ): Promise<TenantUsersEntity[]> {
    const tenantUsersRecords = await this.tenantUsersRepository.find({
      where: { tenantId },
    });

    if (tenantUsersRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    return tenantUsersRecords;
  }

  /**
   * Retrieves tenant user records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user records.
   * @returns Object containing tenant user records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantUsers, total] =
      await this.tenantUsersRepository.findAndCount(findQuery);

    if (tenantUsers.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    return {
      tenantUsersRecords: tenantUsers,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single tenant user record by ID and tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @returns The tenant user entity.
   */
  async findOne(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUsersEntity> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }
    return tenantUser;
  }

  /**
   * Updates a tenant user record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @param updateTenantUsersDto - Data transfer object containing updated tenant user details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantId: number,
    id: number,
    updateTenantUsersDto: UpdateTenantUserDto,
  ): Promise<UpdateResult> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    updateTenantUsersDto.updatedBy = requestingUserId;

    return await this.tenantUsersRepository.update(id, updateTenantUsersDto);
  }

  /**
   * Deletes a tenant user record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    return await this.tenantUsersRepository.delete({
      tenantUserId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering tenant user records.
   * Applies LIKE queries on tenant user fields and user entity fields.
   * @param filtersDto - Filters for querying tenant user records.
   * @returns Query object for filtering.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { user: { first_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's first_name field
        { user: { last_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's last_name field
        { user: { username: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's username field
        { user: { email: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's email field
        { status: { name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on Statuses entity's name field
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
   * @param filtersDto - Filters for querying tenant user records.
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
