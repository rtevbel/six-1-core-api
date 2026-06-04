import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';
import { CreateTenantBillingInfoDto } from './dto/create-tenant_billing_info.dto';
import { UpdateTenantBillingInfoDto } from './dto/update-tenant_billing_info.dto';
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
export class TenantBillingInfoService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantBillingId',
    'tenantId',
    'billingEmail',
    'billingPhone',
    'billingAddress',
    'billingCity',
    'billingState',
    'billingCountry',
    'billingPostalCode',
    'billingCurrency',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantBillingId: 'tbi.tenantBillingId',
    tenantId: 'tbi.tenantId',
    billingEmail: 'tbi.billingEmail',
    billingPhone: 'tbi.billingPhone',
    billingAddress: 'tbi.billingAddress',
    billingCity: 'tbi.billingCity',
    billingState: 'tbi.billingState',
    billingCountry: 'tbi.billingCountry',
    billingPostalCode: 'tbi.billingPostalCode',
    billingCurrency: 'tbi.billingCurrency',
    createdBy: 'tbi.createdBy',
    updatedBy: 'tbi.updatedBy',
    createdAt: 'tbi.createdAt',
    updatedAt: 'tbi.updatedAt',
  };

  constructor(
    @InjectRepository(TenantBillingInfoEntity)
    private readonly tenantBillingInfoRepository: Repository<TenantBillingInfoEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant billing info record.
   * @param userId - ID of the user making the request.
   * @param createTenantBillingInfoDto - DTO containing billing info details.
   * @returns The created TenantBillingInfoEntity.
   */
  async create(
    userId: number,
    createTenantBillingInfoDto: CreateTenantBillingInfoDto,
  ): Promise<TenantBillingInfoEntity> {
    createTenantBillingInfoDto.createdBy = userId;

    return await this.tenantBillingInfoRepository.save(
      this.tenantBillingInfoRepository.create(createTenantBillingInfoDto),
    );
  }

  /**
   * Retrieves billing info records based on catalog-backed dynamic filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching, structured filtering, sorting, and pagination.
   * @returns An object containing the filtered records and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(TenantBillingInfoEntity);

    const ctx: CatalogBackedDynamicListContext<TenantBillingInfoEntity> = {
      repository: this.tenantBillingInfoRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tbi',
      rootEntityClass: TenantBillingInfoEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'billingEmail',
        'billingPhone',
        'billingAddress',
        'billingCity',
        'billingState',
        'billingCountry',
        'billingPostalCode',
        'billingCurrency',
      ],
      fallbackCoreFields: TenantBillingInfoService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantBillingInfoService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantBillingId',
      tieBreakOrderBySql: 'tbi.tenantBillingId',
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
        qb.andWhere('tbi.tenantId = :tbiTenantId', {
          tbiTenantId: row.tenantId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant billing info configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: billingInfoRecords, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!billingInfoRecords.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: billingInfoRecords,
      billingInfoRecords,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a specific billing info record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The TenantBillingInfoEntity record.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantBillingInfoEntity> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }
    return billingInfo;
  }

  /**
   * Updates a specific billing info record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @param updateTenantBillingInfoDto - DTO containing updated billing info details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantBillingInfoDto: UpdateTenantBillingInfoDto,
  ): Promise<UpdateResult> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    updateTenantBillingInfoDto.updatedBy = userId;

    return await this.tenantBillingInfoRepository.update(
      id,
      updateTenantBillingInfoDto,
    );
  }

  /**
   * Deletes a specific billing info record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the billing info record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const billingInfo = await this.tenantBillingInfoRepository.findOne({
      where: { tenantBillingId: id, tenantId },
    });

    if (!billingInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantBillingInfoEntity.name,
        ),
      );
    }

    return await this.tenantBillingInfoRepository.delete({
      tenantBillingId: id,
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
