import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { CreateTenantSubscriptionDto } from './dto/create-tenant_subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant_subscription.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantSubscriptionService {
  private static readonly FALLBACK_FIELDS = new Set([
    'subscriptionId',
    'tenantId',
    'plan',
    'startDate',
    'endDate',
    'isActive',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    subscriptionId: 'ts.subscriptionId',
    tenantId: 'ts.tenantId',
    plan: 'ts.plan',
    startDate: 'ts.startDate',
    endDate: 'ts.endDate',
    isActive: 'ts.isActive',
    createdAt: 'ts.createdAt',
    updatedAt: 'ts.updatedAt',
  };

  constructor(
    @InjectRepository(TenantSubscriptionEntity)
    private readonly tenantSubscriptionRepository: Repository<TenantSubscriptionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant subscription.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantSubscriptionDto - Data for creating the subscription.
   * @returns The created subscription entity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantSubscriptionDto: CreateTenantSubscriptionDto,
  ): Promise<TenantSubscriptionEntity> {
    createTenantSubscriptionDto.tenantId = tenantId;

    return await this.tenantSubscriptionRepository.save(
      this.tenantSubscriptionRepository.create(createTenantSubscriptionDto),
    );
  }

  /**
   * Finds subscriptions based on catalog-backed dynamic filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching, structured filtering, sorting, and pagination.
   * @returns Filtered subscriptions and pagination details.
   */
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

    const canonical = canonicalListObjectTypeForEntity(
      TenantSubscriptionEntity,
    );

    const ctx: CatalogBackedDynamicListContext<TenantSubscriptionEntity> = {
      repository: this.tenantSubscriptionRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'ts',
      rootEntityClass: TenantSubscriptionEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['plan'],
      fallbackCoreFields: TenantSubscriptionService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantSubscriptionService.FALLBACK_EXPR,
      defaultSortCoreField: 'subscriptionId',
      tieBreakOrderBySql: 'ts.subscriptionId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        if (
          typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
        ) {
          return row.catalogTenantId;
        }
        return typeof row.tenantId === 'number' && row.tenantId > 0
          ? row.tenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('ts.tenantId = :tsTenantId', { tsTenantId: row.tenantId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant subscription configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: subscriptions, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!subscriptions.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: subscriptions,
      tenantSubscriptions: subscriptions,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Finds a single subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @returns The subscription entity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantSubscriptionEntity> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }
    return subscription;
  }

  /**
   * Updates a subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @param updateTenantSubscriptionDto - Data for updating the subscription.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantSubscriptionDto: UpdateTenantSubscriptionDto,
  ): Promise<UpdateResult> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    return await this.tenantSubscriptionRepository.update(
      id,
      updateTenantSubscriptionDto,
    );
  }

  /**
   * Removes a subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    return await this.tenantSubscriptionRepository.delete({
      subscriptionId: id,
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
