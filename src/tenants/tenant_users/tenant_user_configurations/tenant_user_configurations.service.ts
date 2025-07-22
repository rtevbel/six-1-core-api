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
   * Creates a new tenant user configuration record.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserConfigurationDto - Data transfer object containing configuration details.
   * @returns The created configuration entity.
   */
  async create(
    requestingUserId: number,
    createTenantUserConfigurationDto: CreateTenantUserConfigurationDto,
  ): Promise<TenantUserConfigurationsEntity> {
    return await this.tenantUserConfigurationsRepository.save(
      this.tenantUserConfigurationsRepository.create({
        ...createTenantUserConfigurationDto,
        createdBy: requestingUserId,
      }),
    );
  }

  /**
   * Retrieves all configurations for a specific tenant user ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @returns Array of configuration entities.
   */
  async findAllByTenantUserId(
    requestingUserId: number,
    tenantUserId: number,
  ): Promise<TenantUserConfigurationsEntity[]> {
    const configurations = await this.tenantUserConfigurationsRepository.find({
      where: { tenantUserId },
    });

    if (configurations.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    return configurations;
  }

  /**
   * Retrieves tenant user invitation records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user invitation records.
   * @returns Object containing tenant user invitation records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
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

    return {
      tenantUserConfigurationRecords: tenantUserInvitations,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single configuration record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the configuration.
   * @returns The configuration entity.
   */
  async findOne(
    requestingUserId: number,
    id: number,
  ): Promise<TenantUserConfigurationsEntity> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id },
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
   * Updates a configuration record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the configuration.
   * @param updateTenantUserConfigurationDto - Data transfer object containing updated configuration details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    id: number,
    updateTenantUserConfigurationDto: UpdateTenantUserConfigurationDto,
  ): Promise<UpdateResult> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id },
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
      id,
      updateTenantUserConfigurationDto,
    );
  }

  /**
   * Deletes a configuration record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the configuration.
   * @returns The result of the delete operation.
   */
  async remove(requestingUserId: number, id: number): Promise<DeleteResult> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: { tenantUserConfigId: id },
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

    return await this.tenantUserConfigurationsRepository.delete(id);
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
        { tenant: { name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on tenant entity's name field
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
