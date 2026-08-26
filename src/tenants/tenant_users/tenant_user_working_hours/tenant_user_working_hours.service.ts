import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { CreateTenantUserWorkingHoursDto } from './dto/create-tenant_user_working_hour.dto';
import { UpdateTenantUserWorkingHoursDto } from './dto/update-tenant_user_working_hour.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class TenantUserWorkingHoursService {
  private static readonly FALLBACK_FIELDS = new Set([
    'tenantUserWorkingHourId',
    'tenantUserId',
    'dayOfWeek',
    'startTime',
    'endTime',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    tenantUserWorkingHourId: 'tuwh.tenantUserWorkingHourId',
    tenantUserId: 'tuwh.tenantUserId',
    dayOfWeek: 'tuwh.dayOfWeek',
    startTime: 'tuwh.startTime',
    endTime: 'tuwh.endTime',
    createdBy: 'tuwh.createdBy',
    updatedBy: 'tuwh.updatedBy',
    createdAt: 'tuwh.createdAt',
    updatedAt: 'tuwh.updatedAt',
  };

  constructor(
    @InjectRepository(TenantUserWorkingHoursEntity)
    private readonly tenantUserWorkingHoursRepository: Repository<TenantUserWorkingHoursEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new TenantUserWorkingHours record.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantUserWorkingHoursDto: CreateTenantUserWorkingHoursDto,
  ): Promise<TenantUserWorkingHoursEntity> {
    const entity = this.tenantUserWorkingHoursRepository.create(
      createTenantUserWorkingHoursDto,
    );
    return await this.tenantUserWorkingHoursRepository.save(entity);
  }

  /**
   * Finds all working hours based on filters.
   */
  async findAllByFilter(
    userId: number,
    tenantId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(
      TenantUserWorkingHoursEntity,
    );

    const ctx: CatalogBackedDynamicListContext<TenantUserWorkingHoursEntity> = {
      repository: this.tenantUserWorkingHoursRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'tuwh',
      rootEntityClass: TenantUserWorkingHoursEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['dayOfWeek', 'startTime', 'endTime'],
      fallbackCoreFields: TenantUserWorkingHoursService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: TenantUserWorkingHoursService.FALLBACK_EXPR,
      defaultSortCoreField: 'tenantUserWorkingHourId',
      tieBreakOrderBySql: 'tuwh.tenantUserWorkingHourId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('tuwh.tenantUserId = :tuwhTenantUserId', {
          tuwhTenantUserId: row.tenantUserId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Tenant user working hour configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: workingHours, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!workingHours.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: workingHours,
      tenantUserWorkingHourRecords: workingHours,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Finds a specific working hour record by ID.
   */
  async findOne(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<TenantUserWorkingHoursEntity> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: { tenantUserWorkingHourId: id, tenantUserId },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return workingHour;
  }

  /**
   * Updates a specific working hour record by ID.
   */
  async update(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
    updateTenantUserWorkingHoursDto: UpdateTenantUserWorkingHoursDto,
  ): Promise<UpdateResult> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: {
        tenantUserWorkingHourId: Number(id),
        tenantUserId: Number(tenantUserId),
      },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return await this.tenantUserWorkingHoursRepository.update(
      {
        tenantUserWorkingHourId: Number(id),
        tenantUserId: Number(tenantUserId),
      },
      updateTenantUserWorkingHoursDto,
    );
  }

  /**
   * Deletes a specific working hour record by ID.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: { tenantUserWorkingHourId: id, tenantUserId },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return await this.tenantUserWorkingHoursRepository.delete({
      tenantUserWorkingHourId: id,
      tenantUserId,
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
