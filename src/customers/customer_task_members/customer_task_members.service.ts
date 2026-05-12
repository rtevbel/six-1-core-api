import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerTaskMemberEntity } from './entities/customer_task_member.entity';
import { CreateCustomerTaskMemberDto } from './dto/create-customer_task_member.dto';
import { UpdateCustomerTaskMemberDto } from './dto/update-customer_task_member.dto';
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
export class CustomerTaskMembersService {
  private static readonly FALLBACK_FIELDS = new Set([
    'customerTaskMemberId',
    'taskId',
    'customerId',
    'roleId',
    'joinedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    customerTaskMemberId: 'ctm.customerTaskMemberId',
    taskId: 'ctm.taskId',
    customerId: 'ctm.customerId',
    roleId: 'ctm.roleId',
    joinedAt: 'ctm.joinedAt',
  };

  constructor(
    @InjectRepository(CustomerTaskMemberEntity)
    private readonly taskMembersRepository: Repository<CustomerTaskMemberEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    createDto: CreateCustomerTaskMemberDto,
  ): Promise<CustomerTaskMemberEntity> {
    return await this.taskMembersRepository.save(
      this.taskMembersRepository.create(createDto),
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

    const canonical = canonicalListObjectTypeForEntity(CustomerTaskMemberEntity);

    const ctx: CatalogBackedDynamicListContext<CustomerTaskMemberEntity> = {
      repository: this.taskMembersRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'ctm',
      rootEntityClass: CustomerTaskMemberEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'customerTaskMemberId',
        'taskId',
        'customerId',
        'roleId',
      ],
      fallbackCoreFields: CustomerTaskMembersService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: CustomerTaskMembersService.FALLBACK_EXPR,
      defaultSortCoreField: 'customerTaskMemberId',
      tieBreakOrderBySql: 'ctm.customerTaskMemberId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto & { catalogTenantId?: number };
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersDto;
        if (typeof f.taskId === 'number') {
          qb.andWhere('ctm.taskId = :taskId', { taskId: f.taskId });
        }
        if (typeof f.customerId === 'number') {
          qb.andWhere('ctm.customerId = :customerId', {
            customerId: f.customerId,
          });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Customer task member schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: taskMembers, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!taskMembers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: taskMembers,
      taskMembers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<CustomerTaskMemberEntity> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerTaskMemberDto,
  ): Promise<UpdateResult> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return await this.taskMembersRepository.update(id, updateDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return await this.taskMembersRepository.delete({
      customerTaskMemberId: id,
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
