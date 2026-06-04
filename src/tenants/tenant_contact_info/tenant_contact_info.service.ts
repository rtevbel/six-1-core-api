import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';
import { CreateTenantContactInfoDto } from './dto/create-tenant_contact_info.dto';
import { UpdateTenantContactInfoDto } from './dto/update-tenant_contact_info.dto';
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
export class TenantContactInfoService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantContactId',
    'tenantId',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'country',
    'postalCode',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantContactId: 'tci.tenantContactId',
    tenantId: 'tci.tenantId',
    email: 'tci.email',
    phone: 'tci.phone',
    address: 'tci.address',
    city: 'tci.city',
    state: 'tci.state',
    country: 'tci.country',
    postalCode: 'tci.postalCode',
    createdBy: 'tci.createdBy',
    updatedBy: 'tci.updatedBy',
    createdAt: 'tci.createdAt',
    updatedAt: 'tci.updatedAt',
  };

  constructor(
    @InjectRepository(TenantContactInfoEntity)
    private readonly tenantContactInfoRepository: Repository<TenantContactInfoEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant contact information record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantContactInfoDto - Data transfer object containing the contact info details.
   * @returns The created TenantContactInfoEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantContactInfoDto: CreateTenantContactInfoDto,
  ): Promise<TenantContactInfoEntity> {
    createTenantContactInfoDto.createdBy = userId;
    createTenantContactInfoDto.tenantId = tenantId;

    return await this.tenantContactInfoRepository.save(
      this.tenantContactInfoRepository.create(createTenantContactInfoDto),
    );
  }

  /**
   * Retrieves contact information records based on catalog-backed dynamic filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching, structured filtering, sorting, and pagination.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilters(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(TenantContactInfoEntity);

    const ctx: CatalogBackedDynamicListContext<TenantContactInfoEntity> = {
      repository: this.tenantContactInfoRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tci',
      rootEntityClass: TenantContactInfoEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postalCode',
      ],
      fallbackCoreFields: TenantContactInfoService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantContactInfoService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantContactId',
      tieBreakOrderBySql: 'tci.tenantContactId',
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
        qb.andWhere('tci.tenantId = :tciTenantId', {
          tciTenantId: row.tenantId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant contact info configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: contactInfoRecords, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!contactInfoRecords.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: contactInfoRecords,
      contactInfoRecords,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a specific contact information record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @returns The TenantContactInfoEntity record.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantContactInfoEntity> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }
    return contactInfo;
  }

  /**
   * Updates a specific contact information record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @param updateTenantContactInfoDto - Data transfer object containing updated contact info details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantContactInfoDto: UpdateTenantContactInfoDto,
  ): Promise<UpdateResult> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    updateTenantContactInfoDto.updatedBy = userId;

    return await this.tenantContactInfoRepository.update(
      id,
      updateTenantContactInfoDto,
    );
  }

  /**
   * Deletes a specific contact information record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the contact information record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const contactInfo = await this.tenantContactInfoRepository.findOne({
      where: { tenantContactId: id, tenantId },
    });

    if (!contactInfo) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantContactInfoEntity.name,
        ),
      );
    }

    return await this.tenantContactInfoRepository.delete({
      tenantContactId: id,
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
