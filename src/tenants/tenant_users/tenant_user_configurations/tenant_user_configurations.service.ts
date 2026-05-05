import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserConfigurationsEntity } from './entities/tenant_user_configuration.entity';
import { CreateTenantUserConfigurationDto } from './dto/create-tenant_user_configuration.dto';
import { UpdateTenantUserConfigurationDto } from './dto/update-tenant_user_configuration.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserConfigurationsService {
  constructor(
    @InjectRepository(TenantUserConfigurationsEntity)
    private readonly tenantUserConfigurationsRepository: Repository<TenantUserConfigurationsEntity>,
  ) {}

  /**
   * Creates a new tenant user configuration.
   * @param userId - The ID of the user performing the operation.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param createTenantUserConfigurationDto - The DTO containing the configuration details.
   * @returns The created tenant user configuration entity.
   */
  async create(
    userId: number,
    tenantUserId: number,
    createTenantUserConfigurationDto: CreateTenantUserConfigurationDto,
  ): Promise<TenantUserConfigurationsEntity> {
    return await this.tenantUserConfigurationsRepository.save(
      this.tenantUserConfigurationsRepository.create(
        createTenantUserConfigurationDto,
      ),
    );
  }

  /**
   * Finds all tenant user configurations based on filters.
   * @param userId - The ID of the user performing the operation.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param filtersDto - The filters to apply.
   * @returns A result containing the configurations and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantUserInvitations, total] =
      await this.tenantUserConfigurationsRepository.findAndCount(findQuery);

    if (tenantUserInvitations.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantUserInvitations,
      tenantUserConfigurationRecords: tenantUserInvitations,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Finds a specific tenant user configuration by ID.
   * @param userId - The ID of the user performing the operation.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the configuration to find.
   * @returns The found tenant user configuration entity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<TenantUserConfigurationsEntity> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id, tenantUserId },
      },
    );

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    return configuration;
  }

  /**
   * Updates a tenant user configuration by ID.
   * @param userId - The ID of the user performing the operation.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the configuration to update.
   * @param updateTenantUserConfigurationDto - The DTO containing the updated details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
    updateTenantUserConfigurationDto: UpdateTenantUserConfigurationDto,
  ): Promise<UpdateResult> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id, tenantUserId },
      },
    );

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    return await this.tenantUserConfigurationsRepository.update(
      { tenantUserConfigId: id, tenantUserId },
      updateTenantUserConfigurationDto,
    );
  }

  /**
   * Deletes a tenant user configuration by ID.
   * @param userId - The ID of the user performing the operation.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the configuration to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id, tenantUserId },
      },
    );

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    return await this.tenantUserConfigurationsRepository.delete({
      tenantUserConfigId: id,
      tenantUserId,
    });
  }

  /**
   * Builds the query object for finding tenant user configurations.
   * @param filtersDto - The filters to apply.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      where: { tenantUserId: filtersDto.tenantUserId },
    };

    if (filtersDto.search) {
      query.where = [
        { user: { first_name: Like(`%${filtersDto.search}%`) } },
        { user: { last_name: Like(`%${filtersDto.search}%`) } },
        { user: { username: Like(`%${filtersDto.search}%`) } },
        { user: { email: Like(`%${filtersDto.search}%`) } },
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
   * Builds the pagination object for the result.
   * @param filtersDto - The filters containing pagination details.
   * @param total - The total number of records.
   * @returns The pagination object.
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
