import { Injectable } from '@nestjs/common';
import { In, Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleDescriptionEntity } from './entities/role-description.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
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
import { ROLES_MAX_PAGE_SIZE } from './constants';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUsersEntity } from '../tenants/tenant_users/entities/tenant_user.entity';
import {
  applyVisibleRolesScope,
  isRoleVisibleUnderScope,
  readPositiveFilterTenantId,
  resolvePlatformRoleCatalogScope,
  SUPER_ADMIN_ROLE_ID,
  type PlatformRoleCatalogScope,
} from '../common/rbac/platform-role-catalog-scope';

@Injectable()
export class RolesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'roleId',
    'statusId',
    'tenantId',
    'isTenantRole',
    'isTenantTeamRole',
    'isCustomerRole',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    roleId: 'r.roleId',
    statusId: 'r.statusId',
    tenantId: 'r.tenantId',
    isTenantRole: 'r.isTenantRole',
    isTenantTeamRole: 'r.isTenantTeamRole',
    isCustomerRole: 'r.isCustomerRole',
    createdAt: 'r.createdAt',
    updatedAt: 'r.updatedAt',
  };

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleDescriptionEntity)
    private readonly roleDescriptionRepository: Repository<RoleDescriptionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new role record.
   * @param userId - ID of the user creating the record.
   * @param createRoleDto - Data Transfer Object containing role details.
   * @returns The created RoleEntity.
   */
  async create(
    userId: number,
    createRoleDto: CreateRoleDto,
  ): Promise<RoleEntity> {
    return await this.roleRepository.save(
      this.roleRepository.create(createRoleDto),
    );
  }

  /**
   * Retrieves all roles with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of roles and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, ROLES_MAX_PAGE_SIZE);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const catalogScope = await this.resolveCatalogScope(userId, filtersDto);
    const canonical = canonicalListObjectTypeForEntity(RoleEntity);

    const ctx: CatalogBackedDynamicListContext<RoleEntity> = {
      repository: this.roleRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'r',
      rootEntityClass: RoleEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [],
      fallbackCoreFields: RolesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: RolesService.FALLBACK_EXPR,
      defaultSortCoreField: 'roleId',
      tieBreakOrderBySql: 'r.roleId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb) => {
        if (catalogScope.mode === 'unscoped') {
          return;
        }
        applyVisibleRolesScope(qb, 'r', catalogScope);
      },
      schemaMissingForRelatedFiltersMessage:
        'Role configuration schema is required for related list filters.',
      maxPageSize: ROLES_MAX_PAGE_SIZE,
      hydrateRoots: (roots) => this.hydrateRolesForList(roots),
    };

    const { rows: roles, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!roles.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          RoleEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: roles,
      roles,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateRolesForList(
    roots: RoleEntity[],
  ): Promise<RoleEntity[]> {
    const ids = roots.map((r) => r.roleId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.roleRepository.find({
      where: { roleId: In(ids) },
      relations: ['descriptions'],
    });
    const byId = new Map(loaded.map((r) => [r.roleId, r]));
    return ids.map((id) => byId.get(id)!).filter(Boolean) as RoleEntity[];
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
   * Retrieves a single role by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the role to retrieve.
   * @returns The RoleEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { roleId: id },
      relations: ['descriptions', 'permissions'],
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }

    await this.assertRoleReadable(userId, role);

    return role;
  }

  /**
   * Updates an existing role record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the role to update.
   * @param updateRoleDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<UpdateResult> {
    const role = await this.roleRepository.findOne({
      where: { roleId: id },
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }

    await this.assertRoleReadable(userId, role);

    const {
      descriptions,
      permissions,
      roleId: _roleId,
      ...roleUpdateData
    } = updateRoleDto;

    if (descriptions) {
      for (const description of descriptions) {
        const languageId = description.languageId ?? 1;
        const {
          roleId: _ignoredRoleId,
          roleDescriptionId: _ignoredRoleDescriptionId,
          ...descriptionFields
        } = description;
        if (description.roleDescriptionId) {
          await this.roleDescriptionRepository.update(
            description.roleDescriptionId,
            {
              ...descriptionFields,
              roleId: id,
              languageId,
            },
          );
          continue;
        }
        const existing = await this.roleDescriptionRepository.findOne({
          where: { roleId: id, languageId },
        });
        if (existing) {
          await this.roleDescriptionRepository.update(existing.roleDescriptionId, {
            ...descriptionFields,
            roleId: id,
            languageId,
          });
        } else {
          await this.roleDescriptionRepository.save(
            this.roleDescriptionRepository.create({
              ...descriptionFields,
              roleId: id,
              languageId,
            }),
          );
        }
      }
    }

    if (permissions) {
      for (const permission of permissions) {
        if (permission.rolePermissionId) {
          await this.rolePermissionRepository.delete({
            rolePermissionId: permission.rolePermissionId,
          });
          continue;
        }

        const permissionRoleId = permission.roleId ?? id;
        const existing = await this.rolePermissionRepository.findOne({
          where: {
            roleId: permissionRoleId,
            permissionId: permission.permissionId,
          },
        });

        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              ...permission,
              roleId: permissionRoleId,
            }),
          );
        }
      }
    }

    if (Object.keys(roleUpdateData).length === 0) {
      return { affected: 1, raw: [], generatedMaps: [] };
    }

    return await this.roleRepository.update({ roleId: id }, roleUpdateData);
  }

  /**
   * Deletes a role record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    const role = await this.roleRepository.findOne({
      where: { roleId: id },
    });
    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }
    await this.assertRoleReadable(userId, role);
    return await this.roleRepository.delete({ roleId: id });
  }

  private async resolveCatalogScope(
    userId: number,
    filtersDto?: Pick<FiltersDto, 'tenantId'> | null,
  ): Promise<PlatformRoleCatalogScope> {
    const filterTenantId = readPositiveFilterTenantId(filtersDto ?? undefined);
    const callerIsSuperAdmin = await this.userHasSuperAdminRole(userId);
    return resolvePlatformRoleCatalogScope({
      filterTenantId,
      callerIsSuperAdmin,
      userId,
    });
  }

  private async userHasSuperAdminRole(userId: number): Promise<boolean> {
    const row = await this.userRoleRepository.findOne({
      where: { userId, roleId: SUPER_ADMIN_ROLE_ID },
      select: ['userRoleId'],
    });
    return row != null;
  }

  private async assertRoleReadable(
    userId: number,
    role: Pick<RoleEntity, 'roleId' | 'tenantId'>,
  ): Promise<void> {
    const scope = await this.resolveCatalogScope(userId);
    if (scope.mode === 'unscoped') {
      return;
    }
    let membershipTenantIds: Set<number> | undefined;
    if (scope.mode === 'membership') {
      const rows = await this.tenantUsersRepository.find({
        where: { userId },
        select: ['tenantId'],
      });
      membershipTenantIds = new Set(
        rows
          .map((r) => r.tenantId)
          .filter((t): t is number => typeof t === 'number' && t > 0),
      );
    }
    if (!isRoleVisibleUnderScope(role, scope, membershipTenantIds)) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }
  }
}
