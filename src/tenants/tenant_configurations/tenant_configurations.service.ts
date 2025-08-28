import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantConfigurationsEntity } from './entities/tenant_configuration.entity';
import { CreateTenantConfigurationsDto } from './dto/create-tenant_configuration.dto';
import { UpdateTenantConfigurationsDto } from './dto/update-tenant_configuration.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantConfigurationsService {
  constructor(
    @InjectRepository(TenantConfigurationsEntity)
    private readonly tenantConfigurationsRepository: Repository<TenantConfigurationsEntity>,
  ) {}

  /**
   * Creates a new tenant configuration.
   * @param userId - ID of the user making the request (used for auditing).
   * @param tenantId - ID of the tenant to associate the configuration with.
   * @param createTenantConfigurationsDto - Data transfer object containing configuration details.
   * @returns The newly created tenant configuration entity.
   */
  async create(
    userId: number,
    createTenantConfigurationsDto: CreateTenantConfigurationsDto,
  ): Promise<TenantConfigurationsEntity> {
    createTenantConfigurationsDto.createdBy = userId;

    return await this.tenantConfigurationsRepository.save(
      this.tenantConfigurationsRepository.create(createTenantConfigurationsDto),
    );
  }

  /**
   * Retrieves configurations based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching, sorting, and pagination.
   * @returns An object containing configurations and pagination details.
   * @throws RpcException if no configurations match the filters.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [configurations, total] =
      await this.tenantConfigurationsRepository.findAndCount(findQuery);

    if (configurations.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantConfigurationsEntity.name,
        ),
      );
    }

    return {
      tenantconfigurationRecords: configurations,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single tenant configuration by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant whose configuration is being retrieved.
   * @param id - ID of the configuration.
   * @returns The tenant configuration entity.
   * @throws RpcException if the configuration is not found.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantConfigurationsEntity> {
    const configuration = await this.tenantConfigurationsRepository.findOne({
      where: { tenantConfigId: id, tenantId },
    });

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantConfigurationsEntity.name,
        ),
      );
    }
    return configuration;
  }

  /**
   * Updates an existing tenant configuration.
   * @param userId - ID of the user making the request (used for auditing).
   * @param tenantId - ID of the tenant whose configuration is being updated.
   * @param id - ID of the configuration to update.
   * @param updateTenantConfigurationsDto - Data transfer object containing updated configuration details.
   * @returns The result of the update operation.
   * @throws RpcException if the configuration is not found.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantConfigurationsDto: UpdateTenantConfigurationsDto,
  ): Promise<UpdateResult> {
    const configuration = await this.tenantConfigurationsRepository.findOne({
      where: { tenantConfigId: id, tenantId },
    });

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantConfigurationsEntity.name,
        ),
      );
    }

    updateTenantConfigurationsDto.updatedBy = userId;

    return await this.tenantConfigurationsRepository.update(
      id,
      updateTenantConfigurationsDto,
    );
  }

  /**
   * Deletes a tenant configuration.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant whose configuration is being deleted.
   * @param id - ID of the configuration to delete.
   * @returns The result of the delete operation.
   * @throws RpcException if the configuration is not found.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const configuration = await this.tenantConfigurationsRepository.findOne({
      where: { tenantConfigId: id, tenantId },
    });

    if (!configuration) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantConfigurationsEntity.name,
        ),
      );
    }

    return await this.tenantConfigurationsRepository.delete({
      tenantConfigId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering configurations.
   * @param filtersDto - Filters for searching, sorting, and pagination.
   * @returns A query object for the repository.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Ensure tenantId is always included in the query
    query.where = { tenantId: filtersDto.tenantId };

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
   * Builds pagination details for filtered results.
   * @param filtersDto - Filters containing pagination details.
   * @param total - Total number of matching records.
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
