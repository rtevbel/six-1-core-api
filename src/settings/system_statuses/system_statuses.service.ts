import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemStatusEntity } from './entities/system-status.entity';
import { CreateSystemStatusDto } from './dto/create-system-status.dto';
import { UpdateSystemStatusDto } from './dto/update-system-status.dto';
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
export class SystemStatusesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'status_id',
    'name',
    'module_name',
    'module_identifier',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    status_id: 's.status_id',
    name: 's.name',
    module_name: 's.module_name',
    module_identifier: 's.module_identifier',
  };

  constructor(
    @InjectRepository(SystemStatusEntity)
    private readonly systemStatusesRepository: Repository<SystemStatusEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new system status record.
   * @param userId - ID of the user creating the record.
   * @param createSystemStatusDto - Data Transfer Object containing status details.
   * @returns The created SystemStatusEntity.
   */
  async create(
    userId: number,
    createSystemStatusDto: CreateSystemStatusDto,
  ): Promise<SystemStatusEntity> {
    return await this.systemStatusesRepository.save(
      this.systemStatusesRepository.create(createSystemStatusDto),
    );
  }

  /**
   * Retrieves all system statuses with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of statuses and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(SystemStatusEntity);

    const ctx: CatalogBackedDynamicListContext<SystemStatusEntity> = {
      repository: this.systemStatusesRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 's',
      rootEntityClass: SystemStatusEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['name', 'module_name', 'module_identifier'],
      fallbackCoreFields: SystemStatusesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: SystemStatusesService.FALLBACK_EXPR,
      defaultSortCoreField: 'status_id',
      tieBreakOrderBySql: 's.status_id',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'System status configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: statuses, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!statuses.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: statuses,
      statuses,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single system status by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the status to retrieve.
   * @returns The SystemStatusEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<SystemStatusEntity> {
    const status = await this.systemStatusesRepository.findOneByOrFail({
      status_id: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    return status;
  }

  /**
   * Updates an existing system status record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the status to update.
   * @param updateSystemStatusDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateSystemStatusDto: UpdateSystemStatusDto,
  ): Promise<UpdateResult> {
    const status = await this.systemStatusesRepository.findOneByOrFail({
      status_id: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    return await this.systemStatusesRepository.update(
      id,
      updateSystemStatusDto,
    );
  }

  /**
   * Deletes a system status record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the status to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.systemStatusesRepository.delete({ status_id: id });
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
