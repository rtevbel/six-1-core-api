import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like , SelectQueryBuilder , Brackets } from 'typeorm';
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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param CreateTenantUserDto - Data transfer object containing tenant user details.
   * @returns The created tenant user entity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantUsersDto: CreateTenantUserDto,
  ): Promise<TenantUsersEntity> {
    createTenantUsersDto.createdBy = userId;
    createTenantUsersDto.tenantId = tenantId;

    return await this.tenantUsersRepository.save(
      this.tenantUsersRepository.create(createTenantUsersDto),
    );
  }

  /**
   * Retrieves tenant user records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user records.
   * @returns Object containing tenant user records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {

    const findQuery = this.buildFindQuery(filtersDto);
    const [tenantUsers, total] = await findQuery.getManyAndCount();

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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @returns The tenant user entity.
   */
  async findOne(
    userId: number,
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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @param updateTenantUsersDto - Data transfer object containing updated tenant user details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
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

    updateTenantUsersDto.updatedBy = userId;

    return await this.tenantUsersRepository.update(id, updateTenantUsersDto);
  }

  /**
   * Deletes a tenant user record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant user.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
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
  private buildFindQuery(
    filtersDto: FiltersDto,
  ): SelectQueryBuilder<TenantUsersEntity> {
    console.log(filtersDto,'filtersDto');
    const qb = this.tenantUsersRepository
      .createQueryBuilder('tu')
      .leftJoinAndSelect('tu.user',   'u')
      .leftJoinAndSelect('tu.status', 's');
  
    qb.andWhere('tu.tenantId = :tenantId', { tenantId: filtersDto.tenantId });

    if (filtersDto.search) {
      qb.andWhere(
        new Brackets(q => {
          q.where('u.first_name LIKE :k', { k: `%${filtersDto.search}%` })
           .orWhere('u.last_name  LIKE :k', { k: `%${filtersDto.search}%` })
           .orWhere('u.username   LIKE :k', { k: `%${filtersDto.search}%` })
           .orWhere('u.email      LIKE :k', { k: `%${filtersDto.search}%` })
           .orWhere('s.name       LIKE :k', { k: `%${filtersDto.search}%` });
        }),
      );
    }
  
    // ---- ordering & pagination ---------------------------------------------
    if (filtersDto.sortBy) {
      qb.orderBy(`tu.${filtersDto.sortBy}`, (filtersDto.sortOrder ?? 'ASC') as 'ASC' | 'DESC');
    }
  
    if (filtersDto.limit) {
      const limit = Math.min(filtersDto.limit, 10);
      const page  = filtersDto.page ?? 1;
      qb.take(limit).skip((page - 1) * limit);
    }
  
    return qb;
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
