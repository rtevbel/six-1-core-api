import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserRoleService {
  constructor(
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
  ) {}

  /**
   * Creates a new tenant user role record.
   * @param userId - ID of the user.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param createTenantUserRoleDto - DTO containing tenant user role details.
   * @returns The created TenantUserRoleEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    createTenantUserRoleDto: CreateTenantUserRoleDto,
  ): Promise<TenantUserRoleEntity> {
    createTenantUserRoleDto.tenantUserId = tenantUserId;
    createTenantUserRoleDto.createdBy = userId;

    return await this.tenantUserRoleRepository.save(
      this.tenantUserRoleRepository.create(createTenantUserRoleDto),
    );
  }

  /**
   * Retrieves all tenant user roles.
   * @param userId - ID of the user.
   * @param tenantId - ID of the tenant.
   * @param filtersDto - Filters DTO for filtering results.
   * @returns An array of TenantUserRoleEntity records.
   */
  async findAll(
    userId: number,
    tenantId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [userRoles, total] =
      await this.tenantUserRoleRepository.findAndCount(findQuery);

    if (userRoles.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }
    return {
      tenantUserRolesRecords: userRoles,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a specific tenant user role by ID.
   * @param userId - ID of the user.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the tenant user role record.
   * @returns The TenantUserRoleEntity record.
   */
  async findOne(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<TenantUserRoleEntity> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserId: tenantUserId, tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }
    return userRole;
  }

  /**
   * Updates a specific tenant user role record.
   * @param userId - ID of the user.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the tenant user role record.
   * @param updateTenantUserRoleDto - DTO containing updated tenant user role details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
    updateTenantUserRoleDto: UpdateTenantUserRoleDto,
  ): Promise<UpdateResult> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserId: tenantUserId, tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }

    return await this.tenantUserRoleRepository.update(
      { tenantUserRoleId: id },
      updateTenantUserRoleDto,
    );
  }

  /**
   * Deletes a specific tenant user role record.
   * @param userId - ID of the user.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the tenant user role record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserId: tenantUserId, tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }

    return await this.tenantUserRoleRepository.delete({
      tenantUserId: tenantUserId,
      tenantUserRoleId: id,
    });
  }

  /**
   * Builds a query object for filtering and pagination.
   * @param filtersDto - Data transfer object containing filter and pagination details.
   * @returns A query object for TypeORM's findAndCount method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = { tenantUserId: filtersDto.tenantUserId };
    if (filtersDto.search) {
      query.where['roleName'] = Like(`%${filtersDto.search}%`);
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
   * Builds pagination details based on filters and total records.
   * @param filtersDto - Data transfer object containing pagination details.
   * @param total - Total number of records matching the filters.
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
