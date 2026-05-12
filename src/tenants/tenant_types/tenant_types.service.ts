import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantTypeEntity } from './entities/tenant_type.entity';
import { CreateTenantTypeDto } from './dto/create-tenant_type.dto';
import { UpdateTenantTypeDto } from './dto/update-tenant_type.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantTypesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantTypeId',
    'name',
    'description',
    'statusId',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantTypeId: 'tt.tenantTypeId',
    name: 'tt.name',
    description: 'tt.description',
    statusId: 'tt.statusId',
    createdAt: 'tt.createdAt',
    updatedAt: 'tt.updatedAt',
  };

  constructor(
    @InjectRepository(TenantTypeEntity)
    private readonly tenantTypeRepository: Repository<TenantTypeEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant type record.
   * @param userId - ID of the user creating the record.
   * @param createTenantTypeDto - Data Transfer Object containing tenant type details.
   * @returns The created TenantTypeEntity.
   */
  async create(
    userId: number,
    createTenantTypeDto: CreateTenantTypeDto,
  ): Promise<TenantTypeEntity> {
    return await this.tenantTypeRepository.save(
      this.tenantTypeRepository.create(createTenantTypeDto),
    );
  }

  /**
   * Retrieves all tenant types with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of tenant types and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(TenantTypeEntity);

    const ctx: CatalogBackedDynamicListContext<TenantTypeEntity> = {
      repository: this.tenantTypeRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tt',
      rootEntityClass: TenantTypeEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['name', 'description'],
      fallbackCoreFields: TenantTypesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantTypesService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantTypeId',
      tieBreakOrderBySql: 'tt.tenantTypeId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'Tenant type configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: tenantTypes, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!tenantTypes.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantTypes,
      tenantTypes,
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
   * Retrieves a single tenant type by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the tenant type to retrieve.
   * @returns The TenantTypeEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TenantTypeEntity> {
    const tenantType = await this.tenantTypeRepository.findOneByOrFail({
      tenantTypeId: id,
    });

    if (!tenantType) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    return tenantType;
  }

  /**
   * Updates an existing tenant type record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the tenant type to update.
   * @param updateTenantTypeDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateTenantTypeDto: UpdateTenantTypeDto,
  ): Promise<UpdateResult> {
    const tenantType = await this.tenantTypeRepository.findOneByOrFail({
      tenantTypeId: id,
    });

    if (!tenantType) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTypeEntity.name,
        ),
      );
    }

    return await this.tenantTypeRepository.update(id, updateTenantTypeDto);
  }

  /**
   * Deletes a tenant type record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the tenant type to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.tenantTypeRepository.delete({ tenantTypeId: id });
  }
}
