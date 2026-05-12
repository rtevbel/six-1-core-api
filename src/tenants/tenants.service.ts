import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantId',
    'name',
    'tenantTypeId',
    'tenantIdentifier',
    'userId',
    'statusId',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantId: 't.tenantId',
    name: 't.name',
    tenantTypeId: 't.tenantTypeId',
    tenantIdentifier: 't.tenantIdentifier',
    userId: 't.userId',
    statusId: 't.statusId',
    createdAt: 't.createdAt',
    updatedAt: 't.updatedAt',
  };

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    private readonly configObjectsService: ConfigObjectsService,
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
    const uniqueId = Date.now().toString(36);
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
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(TenantEntity);

    const ctx: CatalogBackedDynamicListContext<TenantEntity> = {
      repository: this.tenantRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 't',
      rootEntityClass: TenantEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['name', 'tenantIdentifier'],
      fallbackCoreFields: TenantsService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantsService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantId',
      tieBreakOrderBySql: 't.tenantId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'Tenant configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: tenants, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!tenants.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenants,
      tenants,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
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
