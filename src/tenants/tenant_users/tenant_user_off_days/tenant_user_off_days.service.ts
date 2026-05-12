import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserOffDaysEntity } from './entities/tenant_user_off_day.entity';
import { CreateTenantUserOffDayDto } from './dto/create-tenant_user_off_day.dto';
import { UpdateTenantUserOffDayDto } from './dto/update-tenant_user_off_day.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantUserOffDaysService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantUserOffDayId',
    'tenantUserId',
    'offDate',
    'description',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantUserOffDayId: 'tuod.tenantUserOffDayId',
    tenantUserId: 'tuod.tenantUserId',
    offDate: 'tuod.offDate',
    description: 'tuod.description',
    createdBy: 'tuod.createdBy',
    updatedBy: 'tuod.updatedBy',
    createdAt: 'tuod.createdAt',
    updatedAt: 'tuod.updatedAt',
  };

  constructor(
    @InjectRepository(TenantUserOffDaysEntity)
    private readonly tenantUserOffDaysRepository: Repository<TenantUserOffDaysEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    createTenantUserOffDayDto: CreateTenantUserOffDayDto,
  ): Promise<TenantUserOffDaysEntity> {
    return await this.tenantUserOffDaysRepository.save(
      this.tenantUserOffDaysRepository.create({
        ...createTenantUserOffDayDto,
        createdBy: userId,
      }),
    );
  }

  async findOne(userId: number, id: number): Promise<TenantUserOffDaysEntity> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return offDay;
  }

  async update(
    userId: number,
    id: number,
    updateTenantUserOffDayDto: UpdateTenantUserOffDayDto,
  ): Promise<UpdateResult> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return await this.tenantUserOffDaysRepository.update(
      id,
      updateTenantUserOffDayDto,
    );
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return await this.tenantUserOffDaysRepository.delete(id);
  }

  /**
   * Retrieves off-day records based on filters and pagination.
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
      TenantUserOffDaysEntity,
    );

    const ctx: CatalogBackedDynamicListContext<TenantUserOffDaysEntity> = {
      repository: this.tenantUserOffDaysRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tuod',
      rootEntityClass: TenantUserOffDaysEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['description'],
      fallbackCoreFields: TenantUserOffDaysService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantUserOffDaysService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantUserOffDayId',
      tieBreakOrderBySql: 'tuod.tenantUserOffDayId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('tuod.tenantUserId = :tuodTenantUserId', {
          tuodTenantUserId: row.tenantUserId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant user off day configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: offDays, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!offDays.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: offDays,
      tenantUserOffDaysRecords: offDays,
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
}
