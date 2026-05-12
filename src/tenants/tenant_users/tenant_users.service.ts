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
      .filter(Boolean) as TenantUsersEntity[];
  }

  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUsersEntity> {
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
    return tenantUser;
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
