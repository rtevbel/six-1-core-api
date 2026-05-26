import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission_description.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class PermissionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'permission_id',
    'status_id',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    permission_id: 'p.permission_id',
    status_id: 'p.status_id',
    created_by: 'p.created_by',
    updated_by: 'p.updated_by',
    created_at: 'p.created_at',
    updated_at: 'p.updated_at',
  };

  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new permission record.
   * @param userId - ID of the user creating the record.
   * @param createPermissionDto - Data Transfer Object containing permission details.
   * @returns The created PermissionEntity.
   */
  async create(
    userId: number,
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    return await this.permissionRepository.save(
      this.permissionRepository.create(createPermissionDto),
    );
  }

  /**
   * Retrieves all permissions with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of permissions and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(PermissionEntity);

    const ctx: CatalogBackedDynamicListContext<PermissionEntity> = {
      repository: this.permissionRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'p',
      rootEntityClass: PermissionEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [],
      fallbackCoreFields: PermissionsService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: PermissionsService.FALLBACK_EXPR,
      defaultSortCoreField: 'permission_id',
      tieBreakOrderBySql: 'p.permission_id',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'Permission configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: permissions, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!permissions.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);

    return {
      items: permissions,
      permissions,
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
   * Retrieves a single permission by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the permission to retrieve.
   * @returns The PermissionEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<PermissionEntity> {
    const permission = await this.permissionRepository.findOne({
      where: { permission_id: id },
      relations: ['descriptions'],
    });

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    return permission;
  }

  /**
   * Updates an existing permission record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the permission to update.
   * @param updatePermissionDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult> {
    const permission = await this.permissionRepository.findOneByOrFail({
      permission_id: id,
    });

    updatePermissionDto.updated_by = userId;

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    const { descriptions, ...updatePermissionDtoCopy } = updatePermissionDto;

    if (descriptions) {
      for (const description of descriptions) {
        if (description.permission_description_id) {
          await this.permissionDescriptionRepository.update(
            description.permission_description_id,
            description,
          );
        } else {
          description.permission_id = id;
          await this.permissionDescriptionRepository.save(
            this.permissionDescriptionRepository.create(description),
          );
        }
      }
    }

    return await this.permissionRepository.update(id, updatePermissionDtoCopy);
  }

  /**
   * Deletes a permission record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the permission to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.permissionRepository.delete({ permission_id: id });
  }
}
