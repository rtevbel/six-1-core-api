import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserMetaEntity } from './entities/tenant_user_meta.entity';
import { CreateTenantUserMetaDto } from './dto/create-tenant_user_meta.dto';
import { UpdateTenantUserMetaDto } from './dto/update-tenant_user_meta.dto';
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
export class TenantUserMetaService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantUserMetaId',
    'tenantUserId',
    'metaKey',
    'metaValue',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantUserMetaId: 'tum.tenantUserMetaId',
    tenantUserId: 'tum.tenantUserId',
    metaKey: 'tum.metaKey',
    metaValue: 'tum.metaValue',
    createdAt: 'tum.createdAt',
    updatedAt: 'tum.updatedAt',
  };

  constructor(
    @InjectRepository(TenantUserMetaEntity)
    private readonly tenantUserMetaRepository: Repository<TenantUserMetaEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant user metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantUserMetaDto - Data transfer object containing metadata details.
   * @returns The created metadata entity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantUserMetaDto: CreateTenantUserMetaDto,
  ): Promise<TenantUserMetaEntity> {
    return await this.tenantUserMetaRepository.save(
      this.tenantUserMetaRepository.create(createTenantUserMetaDto),
    );
  }

  /**
   * Retrieves tenant user metadata records based on filters.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param filtersDto - Filters for querying tenant user metadata records.
   * @returns Object containing tenant user metadata records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    tenantId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(TenantUserMetaEntity);

    const ctx: CatalogBackedDynamicListContext<TenantUserMetaEntity> = {
      repository: this.tenantUserMetaRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tum',
      rootEntityClass: TenantUserMetaEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['metaKey', 'metaValue'],
      fallbackCoreFields: TenantUserMetaService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantUserMetaService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantUserMetaId',
      tieBreakOrderBySql: 'tum.tenantUserMetaId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('tum.tenantUserId = :tumTenantUserId', {
          tumTenantUserId: row.tenantUserId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant user meta configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: tenantUserMetadata, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!tenantUserMetadata.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantUserMetadata,
      tenantUserMetaRecords: tenantUserMetadata,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the metadata.
   * @returns The metadata entity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<TenantUserMetaEntity> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id, tenantUserId },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return metadata;
  }

  /**
   * Updates a metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the metadata.
   * @param updateTenantUserMetaDto - Data transfer object containing updated metadata details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
    updateTenantUserMetaDto: UpdateTenantUserMetaDto,
  ): Promise<UpdateResult> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id, tenantUserId },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return await this.tenantUserMetaRepository.update(
      { tenantUserMetaId: id, tenantUserId },
      updateTenantUserMetaDto,
    );
  }

  /**
   * Deletes a metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the metadata.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const metadata = await this.tenantUserMetaRepository.findOne({
      where: { tenantUserMetaId: id, tenantUserId },
    });

    if (!metadata) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserMetaEntity.name,
        ),
      );
    }

    return await this.tenantUserMetaRepository.delete({
      tenantUserMetaId: id,
      tenantUserId,
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
