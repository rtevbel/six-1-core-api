import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantConfigurationsEntity } from './entities/tenant_configuration.entity';
import { CreateTenantConfigurationsDto } from './dto/create-tenant_configuration.dto';
import { UpdateTenantConfigurationsDto } from './dto/update-tenant_configuration.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantConfigurationsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantConfigId',
    'tenantId',
    'timezone',
    'languageId',
    'defaultCurrency',
    'weekStartDay',
    'dateFormat',
    'timeFormat',
    'defaultTaskStatus',
    'notificationPreferences',
    'twoFactorAuthEnabled',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantConfigId: 'tc.tenantConfigId',
    tenantId: 'tc.tenantId',
    timezone: 'tc.timezone',
    languageId: 'tc.languageId',
    defaultCurrency: 'tc.defaultCurrency',
    weekStartDay: 'tc.weekStartDay',
    dateFormat: 'tc.dateFormat',
    timeFormat: 'tc.timeFormat',
    defaultTaskStatus: 'tc.defaultTaskStatus',
    notificationPreferences: 'tc.notificationPreferences',
    twoFactorAuthEnabled: 'tc.twoFactorAuthEnabled',
    createdBy: 'tc.createdBy',
    updatedBy: 'tc.updatedBy',
    createdAt: 'tc.createdAt',
    updatedAt: 'tc.updatedAt',
  };

  constructor(
    @InjectRepository(TenantConfigurationsEntity)
    private readonly tenantConfigurationsRepository: Repository<TenantConfigurationsEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant configuration.
   * @param userId - ID of the user making the request (used for auditing).
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
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(
      TenantConfigurationsEntity,
    );

    const ctx: CatalogBackedDynamicListContext<TenantConfigurationsEntity> = {
      repository: this.tenantConfigurationsRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tc',
      rootEntityClass: TenantConfigurationsEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'timezone',
        'defaultCurrency',
        'weekStartDay',
        'dateFormat',
        'timeFormat',
        'defaultTaskStatus',
        'notificationPreferences',
      ],
      fallbackCoreFields: TenantConfigurationsService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantConfigurationsService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantConfigId',
      tieBreakOrderBySql: 'tc.tenantConfigId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        if (
          typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
        ) {
          return row.catalogTenantId;
        }
        return typeof row.tenantId === 'number' && row.tenantId > 0
          ? row.tenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('tc.tenantId = :tcTenantId', { tcTenantId: row.tenantId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: configurations, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!configurations.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantConfigurationsEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: configurations,
      tenantconfigurationRecords: configurations,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
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

  private buildPagination(
    filtersDto: FiltersDto,
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
