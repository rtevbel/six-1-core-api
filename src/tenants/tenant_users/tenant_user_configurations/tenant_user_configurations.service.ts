import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
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
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantUserConfigurationsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantUserConfigId',
    'tenantUserId',
    'timezone',
    'languageId',
    'defaultCurrency',
    'weekStartDay',
    'dateFormat',
    'timeFormat',
    'notificationPreferences',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantUserConfigId: 'tuc.tenantUserConfigId',
    tenantUserId: 'tuc.tenantUserId',
    timezone: 'tuc.timezone',
    languageId: 'tuc.languageId',
    defaultCurrency: 'tuc.defaultCurrency',
    weekStartDay: 'tuc.weekStartDay',
    dateFormat: 'tuc.dateFormat',
    timeFormat: 'tuc.timeFormat',
    notificationPreferences: 'tuc.notificationPreferences',
    createdBy: 'tuc.createdBy',
    updatedBy: 'tuc.updatedBy',
    createdAt: 'tuc.createdAt',
    updatedAt: 'tuc.updatedAt',
  };

  constructor(
    @InjectRepository(TenantUserConfigurationsEntity)
    private readonly tenantUserConfigurationsRepository: Repository<TenantUserConfigurationsEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant user configuration.
   * @param userId - The ID of the user performing the operation.
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
   * @param filtersDto - The filters to apply.
   * @returns A result containing the configurations and pagination details.
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
      TenantUserConfigurationsEntity,
    );

    const ctx: CatalogBackedDynamicListContext<TenantUserConfigurationsEntity> =
      {
        repository: this.tenantUserConfigurationsRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'tuc',
        rootEntityClass: TenantUserConfigurationsEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: [
          'timezone',
          'defaultCurrency',
          'weekStartDay',
          'dateFormat',
          'timeFormat',
          'notificationPreferences',
        ],
        fallbackCoreFields: TenantUserConfigurationsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          TenantUserConfigurationsService.FALLBACK_EXPR,
        defaultSortCoreField: 'tenantUserConfigId',
        tieBreakOrderBySql: 'tuc.tenantUserConfigId',
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
          qb.andWhere('tuc.tenantUserId = :tucTenantUserId', {
            tucTenantUserId: row.tenantUserId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Tenant user configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: configurations, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!configurations.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserConfigurationsEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: configurations,
      tenantUserConfigurationRecords: configurations,
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
        where: {
          tenantUserConfigId: Number(id),
          tenantUserId: Number(tenantUserId),
        },
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
        where: {
          tenantUserConfigId: Number(id),
          tenantUserId: Number(tenantUserId),
        },
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
      { tenantUserConfigId: Number(id), tenantUserId: Number(tenantUserId) },
      updateTenantUserConfigurationDto,
    );
  }

  /**
   * Deletes a tenant user configuration by ID.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const configuration = await this.tenantUserConfigurationsRepository.findOne(
      {
        where: {
          tenantUserConfigId: Number(id),
          tenantUserId: Number(tenantUserId),
        },
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
      tenantUserConfigId: Number(id),
      tenantUserId: Number(tenantUserId),
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
