import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerProjectMemberEntity } from './entities/customer_project_member.entity';
import { CreateCustomerProjectMemberDto } from './dto/create-customer_project_member.dto';
import { UpdateCustomerProjectMemberDto } from './dto/update-customer_project_member.dto';
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
export class CustomerProjectMembersService {
  private static readonly FALLBACK_FIELDS = new Set([
    'customerProjectMemberId',
    'projectId',
    'customerId',
    'roleId',
    'joinedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    customerProjectMemberId: 'cpm.customerProjectMemberId',
    projectId: 'cpm.projectId',
    customerId: 'cpm.customerId',
    roleId: 'cpm.roleId',
    joinedAt: 'cpm.joinedAt',
  };

  constructor(
    @InjectRepository(CustomerProjectMemberEntity)
    private readonly projectMembersRepository: Repository<CustomerProjectMemberEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    createDto: CreateCustomerProjectMemberDto,
  ): Promise<CustomerProjectMemberEntity> {
    return await this.projectMembersRepository.save(
      this.projectMembersRepository.create(createDto),
    );
  }

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

    const canonical =
      canonicalListObjectTypeForEntity(CustomerProjectMemberEntity);

    const ctx: CatalogBackedDynamicListContext<CustomerProjectMemberEntity> = {
      repository: this.projectMembersRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'cpm',
      rootEntityClass: CustomerProjectMemberEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'customerProjectMemberId',
        'projectId',
        'customerId',
        'roleId',
      ],
      fallbackCoreFields: CustomerProjectMembersService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions:
        CustomerProjectMembersService.FALLBACK_EXPR,
      defaultSortCoreField: 'customerProjectMemberId',
      tieBreakOrderBySql: 'cpm.customerProjectMemberId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto & { catalogTenantId?: number };
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersDto;
        if (typeof f.projectId === 'number') {
          qb.andWhere('cpm.projectId = :projectId', {
            projectId: f.projectId,
          });
        }
        if (typeof f.customerId === 'number') {
          qb.andWhere('cpm.customerId = :customerId', {
            customerId: f.customerId,
          });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Customer project member schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: projectMembers, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!projectMembers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: projectMembers,
      projectMembers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    id: number,
  ): Promise<CustomerProjectMemberEntity> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerProjectMemberDto,
  ): Promise<UpdateResult> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return await this.projectMembersRepository.update(id, updateDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return await this.projectMembersRepository.delete({
      customerProjectMemberId: id,
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
