import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantOffDaysEntity } from './entities/tenant_off_day.entity';
import { CreateTenantOffDaysDto } from './dto/create-tenant_off_day.dto';
import { UpdateTenantOffDaysDto } from './dto/update-tenant_off_day.dto';
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
export class TenantOffDaysService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantOffDayId',
    'tenantId',
    'offDate',
    'description',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantOffDayId: 'tod.tenantOffDayId',
    tenantId: 'tod.tenantId',
    offDate: 'tod.offDate',
    description: 'tod.description',
    createdBy: 'tod.createdBy',
    updatedBy: 'tod.updatedBy',
    createdAt: 'tod.createdAt',
    updatedAt: 'tod.updatedAt',
  };

  constructor(
    @InjectRepository(TenantOffDaysEntity)
    private readonly tenantOffDaysRepository: Repository<TenantOffDaysEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantOffDaysDto - DTO containing the data for the new record.
   * @returns The created TenantOffDaysEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantOffDaysDto: CreateTenantOffDaysDto,
  ): Promise<TenantOffDaysEntity> {
    createTenantOffDaysDto.createdBy = userId;

    return await this.tenantOffDaysRepository.save(
      this.tenantOffDaysRepository.create(createTenantOffDaysDto),
    );
  }

  /**
   * Finds all tenant off day records for a specific tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns An object containing the data and total count.
   */
  async findAllByTenantId(
    userId: number,
    tenantId: number,
  ): Promise<TenantOffDaysEntity[]> {
    const offDays = await this.tenantOffDaysRepository.findBy({ tenantId });

    if (offDays.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    return offDays;
  }

  /**
   * Finds tenant off day records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - DTO containing filter criteria.
   * @returns An object containing filtered records and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(TenantOffDaysEntity);

    const ctx: CatalogBackedDynamicListContext<TenantOffDaysEntity> = {
      repository: this.tenantOffDaysRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tod',
      rootEntityClass: TenantOffDaysEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['description'],
      fallbackCoreFields: TenantOffDaysService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantOffDaysService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantOffDayId',
      tieBreakOrderBySql: 'tod.tenantOffDayId',
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
        qb.andWhere('tod.tenantId = :todTenantId', {
          todTenantId: row.tenantId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant off day configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: offDaysRecords, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!offDaysRecords.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: offDaysRecords,
      tenantOffDaysRecords: offDaysRecords,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Finds a specific tenant off day record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @returns The found TenantOffDaysEntity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantOffDaysEntity> {
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }
    return offDay;
  }

  /**
   * Updates a tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @param updateTenantOffDaysDto - DTO containing updated data.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantOffDaysDto: UpdateTenantOffDaysDto,
  ): Promise<UpdateResult> {
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    updateTenantOffDaysDto.updatedBy = userId;

    return await this.tenantOffDaysRepository.update(
      id,
      updateTenantOffDaysDto,
    );
  }

  /**
   * Deletes a tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    return await this.tenantOffDaysRepository.delete({
      tenantOffDayId: id,
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
