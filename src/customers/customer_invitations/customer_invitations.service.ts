import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerInvitationEntity } from './entities/customer_invitation.entity';
import { CreateCustomerInvitationDto } from './dto/create-customer_invitation.dto';
import { UpdateCustomerInvitationDto } from './dto/update-customer_invitation.dto';
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
export class CustomerInvitationsService {
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'invitationId',
    'projectId',
    'taskId',
    'email',
    'status',
    'customerRoleId',
    'invitedBy',
    'invitedAt',
    'expiresAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    invitationId: 'ci.invitationId',
    projectId: 'ci.projectId',
    taskId: 'ci.taskId',
    email: 'ci.email',
    status: 'ci.status',
    customerRoleId: 'ci.customerRoleId',
    invitedBy: 'ci.invitedBy',
    invitedAt: 'ci.invitedAt',
    expiresAt: 'ci.expiresAt',
  };

  constructor(
    @InjectRepository(CustomerInvitationEntity)
    private readonly invitationRepository: Repository<CustomerInvitationEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a customer invitation row.
   */
  async create(
    userId: number,
    createDto: CreateCustomerInvitationDto,
  ): Promise<CustomerInvitationEntity> {
    createDto.invitedBy = userId;
    return await this.invitationRepository.save(
      this.invitationRepository.create(createDto),
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

    const canonicalType = canonicalListObjectTypeForEntity(
      CustomerInvitationEntity,
    );

    const ctx: CatalogBackedDynamicListContext<CustomerInvitationEntity> = {
      repository: this.invitationRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonicalType,
      rootAlias: 'ci',
      rootEntityClass: CustomerInvitationEntity,
      denyCatalogCanonicalType: canonicalType,
      searchCorePropertyNames: ['email'],
      fallbackCoreFields: CustomerInvitationsService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions: CustomerInvitationsService.FALLBACK_EXPR,
      defaultSortCoreField: 'invitationId',
      tieBreakOrderBySql: 'ci.invitationId',
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
          qb.andWhere('ci.projectId = :projectId', { projectId: f.projectId });
        }
        if (typeof f.taskId === 'number') {
          qb.andWhere('ci.taskId = :taskId', { taskId: f.taskId });
        }
        if (f.status) {
          qb.andWhere('ci.status = :invStatus', { invStatus: f.status });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Customer invitation schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: invitations, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!invitations.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: invitations,
      invitations,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<CustomerInvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return invitation;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerInvitationDto,
  ): Promise<UpdateResult> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return await this.invitationRepository.update(
      invitation.invitationId,
      updateDto,
    );
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return await this.invitationRepository.delete({ invitationId: id });
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
