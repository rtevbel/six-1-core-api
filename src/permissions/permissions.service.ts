import { Injectable } from '@nestjs/common';
import { In, Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission_description.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
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
import { PERMISSIONS_MAX_PAGE_SIZE } from './constants';

@Injectable()
export class PermissionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'permissionId',
    'statusId',
    'name',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    permissionId: 'p.permission_id',
    statusId: 'p.status_id',
    name: `(SELECT pd.name FROM permission_descriptions pd WHERE pd.permission_id = p.permission_id ORDER BY pd.language_id ASC LIMIT 1)`,
    createdBy: 'p.created_by',
    updatedBy: 'p.updated_by',
    createdAt: 'p.created_at',
    updatedAt: 'p.updated_at',
  };

  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
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
      filtersDto.limit = Math.min(filtersDto.limit, PERMISSIONS_MAX_PAGE_SIZE);
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
      defaultSortCoreField: 'permissionId',
      tieBreakOrderBySql: 'p.permission_id',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      augmentSearchRawOrClauses: () => [
        `EXISTS (SELECT 1 FROM permission_descriptions p_s_desc WHERE p_s_desc.permission_id = p.permission_id AND (LOWER(p_s_desc.name) LIKE LOWER(:_sorSearch) OR LOWER(COALESCE(p_s_desc.description, '')) LIKE LOWER(:_sorSearch) OR LOWER(COALESCE(p_s_desc.permission_group, '')) LIKE LOWER(:_sorSearch)))`,
      ],
      schemaMissingForRelatedFiltersMessage:
        'Permission configuration schema is required for related list filters.',
      maxPageSize: PERMISSIONS_MAX_PAGE_SIZE,
      hydrateRoots: (roots) => this.hydratePermissionsForList(roots),
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

  private async hydratePermissionsForList(
    roots: PermissionEntity[],
  ): Promise<PermissionEntity[]> {
    const ids = roots.map((r) => r.permissionId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.permissionRepository.find({
      where: { permissionId: In(ids) },
      relations: ['descriptions'],
    });
    const byId = new Map(loaded.map((p) => [p.permissionId, p]));
    return ids
      .map((id) => byId.get(id)!)
      .filter(Boolean) as PermissionEntity[];
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
  async findOne(
    userId: number,
    id: number,
  ): Promise<PermissionEntity & { roles?: RolePermissionEntity[] }> {
    const permission = await this.permissionRepository.findOne({
      where: { permissionId: id },
      relations: ['descriptions', 'rolePermissions'],
    });

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    return {
      ...permission,
      roles: permission.rolePermissions ?? [],
    };
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
      permissionId: id,
    });

    updatePermissionDto.updatedBy = userId;

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    const { descriptions, roles, permissionId: _permissionId, ...updatePermissionDtoCopy } =
      updatePermissionDto;

    if (descriptions) {
      for (const description of descriptions) {
        if (description.permissionDescriptionId) {
          await this.permissionDescriptionRepository.update(
            description.permissionDescriptionId,
            description,
          );
        } else {
          description.permissionId = id;
          await this.permissionDescriptionRepository.save(
            this.permissionDescriptionRepository.create(description),
          );
        }
      }
    }

    if (roles) {
      for (const role of roles) {
        if (role.rolePermissionId) {
          await this.rolePermissionRepository.delete({
            rolePermissionId: role.rolePermissionId,
          });
          continue;
        }

        const permissionRoleId = role.permissionId ?? id;
        const roleId = role.roleId;
        if (roleId == null) {
          continue;
        }

        const existing = await this.rolePermissionRepository.findOne({
          where: {
            roleId,
            permissionId: permissionRoleId,
          },
        });

        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              ...role,
              roleId,
              permissionId: permissionRoleId,
            }),
          );
        }
      }
    }

    if (Object.keys(updatePermissionDtoCopy).length === 0) {
      return { affected: 1, raw: [], generatedMaps: [] };
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
    return await this.permissionRepository.delete({ permissionId: id });
  }
}
