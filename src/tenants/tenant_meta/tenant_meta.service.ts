import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantMetaEntity } from './entities/tenant_meta.entity';
import { CreateTenantMetaDto } from './dto/create-tenant_meta.dto';
import { UpdateTenantMetaDto } from './dto/update-tenant_meta.dto';
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
export class TenantMetaService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantMetaId',
    'tenantId',
    'metaKey',
    'metaValue',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantMetaId: 'tm.tenantMetaId',
    tenantId: 'tm.tenantId',
    metaKey: 'tm.metaKey',
    metaValue: 'tm.metaValue',
    createdAt: 'tm.createdAt',
    updatedAt: 'tm.updatedAt',
  };

  constructor(
    @InjectRepository(TenantMetaEntity)
    private readonly tenantMetaRepository: Repository<TenantMetaEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param createTenantMetaDto - Data Transfer Object containing metadata details.
   * @returns The created TenantMetaEntity.
   */
  async create(
    userId: number,
    createTenantMetaDto: CreateTenantMetaDto,
  ): Promise<TenantMetaEntity> {
    const newMeta = this.tenantMetaRepository.create(createTenantMetaDto);
    return this.tenantMetaRepository.save(newMeta);
  }

  /**
   * Retrieves all tenant metadata records for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   * @throws RpcException if no records are found.
   */
  async findAllByFilters(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(TenantMetaEntity);

    const ctx: CatalogBackedDynamicListContext<TenantMetaEntity> = {
      repository: this.tenantMetaRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tm',
      rootEntityClass: TenantMetaEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['metaKey', 'metaValue'],
      fallbackCoreFields: TenantMetaService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantMetaService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantMetaId',
      tieBreakOrderBySql: 'tm.tenantMetaId',
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
        qb.andWhere('tm.tenantId = :tmTenantId', { tmTenantId: row.tenantId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant meta configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: tenantMetaRecords, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!tenantMetaRecords.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantMetaRecords,
      tenantMetaRecords,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record.
   * @returns The TenantMetaEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    tenantMetaId: number,
  ): Promise<TenantMetaEntity> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return tenantMeta;
  }

  /**
   * Updates an existing tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to update.
   * @param updateTenantMetaDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    tenantMetaId: number,
    updateTenantMetaDto: UpdateTenantMetaDto,
  ): Promise<UpdateResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }
    return this.tenantMetaRepository.update(tenantMetaId, updateTenantMetaDto);
  }

  /**
   * Deletes a tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, tenantMetaId: number): Promise<DeleteResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return this.tenantMetaRepository.delete({ tenantMetaId });
  }

  /**
   * Finds the meta value for a specific tenant and meta key.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the metadata.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   * @throws RpcException if no record is found.
   */
  async findMetaValueByTenantIdAndMetaKey(
    userId: number,
    tenantId: number,
    metaKey: string,
  ): Promise<string> {
    const meta = await this.tenantMetaRepository.findOne({
      where: { tenantId, metaKey },
    });

    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return meta.metaValue;
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
