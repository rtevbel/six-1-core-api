import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeleteResult, UpdateResult } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ResourceEntity } from '../entities/resource.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { FiltersResourceDto } from '../dto/filters-resource.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { ResourceMetaEntity } from '../entities/resource_meta.entity';
import {
  executeSorBoundDynamicListQuery,
  type SorBoundDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

export interface FindAllResourcesResultInterface {
  items: ResourceEntity[];
  resourceRecords: ResourceEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}

@Injectable()
export class ResourcesService {
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'resourceId',
    'tenantId',
    'tenantUserId',
    'type',
    'name',
    'description',
    'isShared',
    'createdAt',
  ]);

  private static readonly FALLBACK_CORE_FIELD_TO_COLUMN: Record<
    string,
    string
  > = {
    resourceId: 'r.resourceId',
    tenantId: 'r.tenantId',
    tenantUserId: 'r.tenantUserId',
    type: 'r.type',
    name: 'r.name',
    description: 'r.description',
    isShared: 'r.isShared',
    createdAt: 'r.createdAt',
  };

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly repo: Repository<ResourceEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new resource.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing resource details.
   * @returns The created ResourceEntity.
   */
  async create(
    userId: number,
    createDto: CreateResourceDto,
  ): Promise<ResourceEntity> {
    return await this.repo.save(this.repo.create(createDto));
  }

  /**
   * Retrieves all resources with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of resources and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersResourceDto,
  ): Promise<FindAllResourcesResultInterface> {
    filtersDto.page =
      filtersDto.page && filtersDto.page > 0 ? filtersDto.page : 1;
    const rawLimit =
      filtersDto.limit && filtersDto.limit > 0 ? filtersDto.limit : 10;
    filtersDto.limit = Math.min(rawLimit, 10);
    filtersDto.sortBy = filtersDto.sortBy ?? 'resourceId';
    filtersDto.sortOrder = filtersDto.sortOrder ?? 'DESC';
    filtersDto.sortSource = filtersDto.sortSource ?? 'core';

    const ctx: SorBoundDynamicListContext<ResourceEntity> = {
      repository: this.repo,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: 'resource',
      rootAlias: 'r',
      rootEntityClass: ResourceEntity,
      denyCatalogCanonicalType: 'resource',
      meta: {
        entity: ResourceMetaEntity,
        alias: 'rm',
        joinConditionSql: 'rm.resourceId = r.resourceId',
      },
      searchCorePropertyNames: ['name', 'description'],
      fallbackCoreFields: ResourcesService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions:
        ResourcesService.FALLBACK_CORE_FIELD_TO_COLUMN,
      defaultSortCoreField: 'resourceId',
      tieBreakOrderBySql: 'r.resourceId',
      catalogTenantResolver: (f) =>
        typeof f.tenantId === 'number' && f.tenantId > 0 ? f.tenantId : null,
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersResourceDto;
        if (typeof f.tenantId === 'number') {
          qb.andWhere('r.tenantId = :tenantId', { tenantId: f.tenantId });
        }
        if (typeof f.tenantUserId === 'number') {
          qb.andWhere('r.tenantUserId = :tenantUserId', {
            tenantUserId: f.tenantUserId,
          });
        }
        if (f.type) {
          qb.andWhere('r.type = :resourceType', {
            resourceType: f.type,
          });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Resource configuration schema is required for related list filters.',
      maxPageSize: 10,
      hydrateRoots: (roots) => this.hydrateResourcesForList(roots),
    };

    const { rows: items, total } = await executeSorBoundDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ResourceEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: items,
      resourceRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateResourcesForList(
    roots: ResourceEntity[],
  ): Promise<ResourceEntity[]> {
    const ids = roots.map((row) => row.resourceId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.repo.find({
      where: { resourceId: In(ids) },
      relations: ['tenant', 'tenantUser'],
    });
    const byId = new Map(loaded.map((row) => [row.resourceId, row]));
    return ids.map((id) => byId.get(id)!).filter(Boolean) as ResourceEntity[];
  }

  /**
   * Retrieves a single resource by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the resource to retrieve.
   * @returns The ResourceEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ResourceEntity> {
    const resource = await this.repo.findOne({
      where: { resourceId: id },
      relations: ['tenant', 'tenantUser'],
    });

    if (!resource) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceEntity.name,
        ),
      );
    }

    return resource;
  }

  /**
   * Updates an existing resource record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the resource to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateResourceDto,
  ): Promise<UpdateResult> {
    const resource = await this.repo.findOne({ where: { resourceId: id } });

    if (!resource) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceEntity.name,
        ),
      );
    }

    return await this.repo.update(id, updateDto);
  }

  /**
   * Deletes a resource record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the resource to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.repo.delete({ resourceId: id });
  }

  /**
   * Builds pagination details based on filters and total count.
   * @private
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records matching the filters.
   * @returns An object containing pagination details.
   */
  private buildPagination(
    filtersDto: FiltersResourceDto,
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
