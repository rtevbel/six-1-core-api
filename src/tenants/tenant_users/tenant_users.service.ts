import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, In } from 'typeorm';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUsersEntity } from './entities/tenant_user.entity';
import { CreateTenantUserDto } from './dto/create-tenant_user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant_user.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import { UserEntity } from '../../users/entities/user.entity';
import { SystemStatusEntity } from '../../settings/system_statuses/entities/system-status.entity';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';
import { UserRoleEntity } from '../../users/user-roles/entities/user-role.entity';
import { SUPER_ADMIN_ROLE_ID } from '../../common/rbac/platform-role-catalog-scope';
import { TenantTeamEntity } from '../tenant_teams/entities/tenant_team.entity';

export type TenantAccessAssertionResult = {
  allowed: true;
  tenantUserId: number | null;
  isSuperAdmin: boolean;
  tenantId: number;
};

export type AssertTenantAccessInput = {
  tenantId?: number | null;
  tenantTeamId?: number | null;
};

@Injectable()
export class TenantUsersService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantUserId',
    'tenantId',
    'userId',
    'statusId',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantUserId: 'tu.tenantUserId',
    tenantId: 'tu.tenantId',
    userId: 'tu.userId',
    statusId: 'tu.statusId',
    createdBy: 'tu.createdBy',
    updatedBy: 'tu.updatedBy',
    createdAt: 'tu.createdAt',
    updatedAt: 'tu.updatedAt',
  };

  constructor(
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(TenantTeamEntity)
    private readonly tenantTeamRepository: Repository<TenantTeamEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    tenantId: number,
    createTenantUsersDto: CreateTenantUserDto,
  ): Promise<TenantUsersEntity> {
    createTenantUsersDto.createdBy = userId;
    createTenantUsersDto.tenantId = tenantId;

    return await this.tenantUsersRepository.save(
      this.tenantUsersRepository.create(createTenantUsersDto),
    );
  }

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

    const canonical = canonicalListObjectTypeForEntity(TenantUsersEntity);

    const ctx: CatalogBackedDynamicListContext<TenantUsersEntity> = {
      repository: this.tenantUsersRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tu',
      rootEntityClass: TenantUsersEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'tenantUserId',
        'tenantId',
        'userId',
        'statusId',
      ],
      fallbackCoreFields: TenantUsersService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantUsersService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantUserId',
      tieBreakOrderBySql: 'tu.tenantUserId',
      augmentSearchExpressions: (qb, filters) => {
        if (!filters.search?.trim()) {
          return [];
        }
        qb.leftJoin(UserEntity, 'tu_s_u', 'tu_s_u.userId = tu.userId');
        qb.leftJoin(
          SystemStatusEntity,
          'tu_s_st',
          'tu_s_st.status_id = tu.statusId',
        );
        return [
          'tu_s_u.email',
          'tu_s_u.username',
          'tu_s_u.firstName',
          'tu_s_u.lastName',
          'tu_s_st.name',
        ];
      },
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.tenantId === 'number' && row.tenantId > 0
          ? row.tenantId
          : typeof row.catalogTenantId === 'number' && row.catalogTenantId > 0
            ? row.catalogTenantId!
            : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersDto;
        qb.andWhere('tu.tenantId = :tenantId', { tenantId: f.tenantId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant user configuration schema is required for related list filters.',
      maxPageSize: 10,
      hydrateRoots: (roots) => this.hydrateTenantUsersRows(roots),
    };

    const { rows: tenantUsers, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!tenantUsers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantUsers,
      tenantUsersRecords: tenantUsers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateTenantUsersRows(
    roots: TenantUsersEntity[],
  ): Promise<TenantUsersEntity[]> {
    const ids = roots.map((r) => r.tenantUserId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.tenantUsersRepository.find({
      where: { tenantUserId: In(ids) },
      relations: ['user', 'status'],
    });
    const byId = new Map(loaded.map((t) => [t.tenantUserId, t]));
    return ids
      .map((id) => byId.get(id)!)
      .filter(Boolean)
      .map((row) => this.attachTenantUserDisplayName(row));
  }

  private attachTenantUserDisplayName(
    row: TenantUsersEntity,
  ): TenantUsersEntity {
    const user = row.user as
      | {
          password?: string;
          displayName?: string;
          firstName?: string;
          lastName?: string;
          email?: string;
        }
      | undefined;
    if (!user) {
      return row;
    }
    delete user.password;
    const displayName =
      user.displayName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email;
    if (displayName) {
      (row as TenantUsersEntity & { displayName?: string }).displayName =
        displayName;
    }
    return row;
  }

  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUsersEntity> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
      relations: ['user', 'status'],
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }
    return this.attachTenantUserDisplayName(tenantUser);
  }

  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantUsersDto: UpdateTenantUserDto,
  ): Promise<UpdateResult> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    updateTenantUsersDto.updatedBy = userId;

    return await this.tenantUsersRepository.update(
      tenantUser.tenantUserId,
      updateTenantUsersDto,
    );
  }

  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const tenantUser = await this.tenantUsersRepository.findOne({
      where: { tenantUserId: id, tenantId },
    });

    if (!tenantUser) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUsersEntity.name,
        ),
      );
    }

    return await this.tenantUsersRepository.delete({
      tenantUserId: id,
      tenantId,
    });
  }

  /**
   * Assert the caller may access tenant-scoped APIs.
   * Resolves tenant from `tenantId` and/or `tenantTeamId` (team → tenant).
   * Super Admin (global user_roles.role_id = 1) may access any tenant.
   * Otherwise the caller must have a `tenant_users` membership row.
   */
  async assertTenantAccess(
    userId: number,
    input: number | AssertTenantAccessInput,
  ): Promise<TenantAccessAssertionResult> {
    const scope =
      typeof input === 'number'
        ? { tenantId: input, tenantTeamId: null }
        : {
            tenantId: input.tenantId ?? null,
            tenantTeamId: input.tenantTeamId ?? null,
          };

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      });
    }

    let tenantId =
      typeof scope.tenantId === 'number' &&
      Number.isFinite(scope.tenantId) &&
      scope.tenantId > 0
        ? Math.trunc(scope.tenantId)
        : null;

    if (
      tenantId == null &&
      typeof scope.tenantTeamId === 'number' &&
      Number.isFinite(scope.tenantTeamId) &&
      scope.tenantTeamId > 0
    ) {
      const team = await this.tenantTeamRepository.findOne({
        where: { tenantTeamId: Math.trunc(scope.tenantTeamId) },
        select: ['tenantTeamId', 'tenantId'],
      });
      if (!team || !(team.tenantId > 0)) {
        throw new RpcException({
          statusCode: 403,
          message: 'Tenant scope mismatch',
        });
      }
      tenantId = team.tenantId;
    }

    if (tenantId == null || tenantId <= 0) {
      throw new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      });
    }

    const isSuperAdmin = await this.userHasSuperAdminRole(userId);
    if (isSuperAdmin) {
      return {
        allowed: true,
        tenantUserId: null,
        isSuperAdmin: true,
        tenantId,
      };
    }

    const membership = await this.tenantUsersRepository.findOne({
      where: { userId, tenantId },
      select: ['tenantUserId'],
    });
    if (!membership) {
      throw new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      });
    }

    return {
      allowed: true,
      tenantUserId: membership.tenantUserId,
      isSuperAdmin: false,
      tenantId,
    };
  }

  private async userHasSuperAdminRole(userId: number): Promise<boolean> {
    const row = await this.userRoleRepository.findOne({
      where: { userId, roleId: SUPER_ADMIN_ROLE_ID },
      select: ['userRoleId'],
    });
    return row != null;
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
