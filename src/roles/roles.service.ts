import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
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
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

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
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'Role configuration schema is required for related list filters.',
      maxPageSize: 10,
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
    const role = await this.roleRepository.findOneByOrFail({
      roleId: id,
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }

    const { descriptions, permissions, ...roleUpdateData } = updateRoleDto;

    if (descriptions) {
      for (const description of descriptions) {
        if (description.roleDescriptionId) {
          await this.roleDescriptionRepository.update(
            description.roleDescriptionId,
            description,
          );
        } else {
          description.roleId = id;
          await this.roleDescriptionRepository.save(
            this.roleDescriptionRepository.create(description),
          );
        }
      }
    }

    if (permissions) {
      for (const permission of permissions) {
        if (permission.rolePermissionId) {
          await this.rolePermissionRepository.update(
            permission.rolePermissionId,
            permission,
          );
        } else {
          permission.roleId = id;
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create(permission),
          );
        }
      }
    }

    return await this.roleRepository.update(id, roleUpdateData);
  }

  /**
   * Deletes a role record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.roleRepository.delete({ roleId: id });
  }
}
