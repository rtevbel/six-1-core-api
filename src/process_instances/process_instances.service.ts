import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { CreateProcessInstanceDto } from './dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process_instance.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../automation/process-subject.constants';
import { canonicalListObjectTypeForEntity } from '../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class ProcessInstancesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'processInstanceId',
    'processTemplateId',
    'tenantId',
    'subjectType',
    'subjectId',
    'status',
    'correlationId',
    'createdBy',
    'startedAt',
    'completedAt',
    'canceledAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    processInstanceId: 'pi.processInstanceId',
    processTemplateId: 'pi.processTemplateId',
    tenantId: 'pi.tenantId',
    subjectType: 'pi.subjectType',
    subjectId: 'pi.subjectId',
    status: 'pi.status',
    correlationId: 'pi.correlationId',
    createdBy: 'pi.createdBy',
    startedAt: 'pi.startedAt',
    completedAt: 'pi.completedAt',
    canceledAt: 'pi.canceledAt',
  };

  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processInstanceRepository: Repository<ProcessInstanceEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new process instance record.
   */
  async create(
    userId: number,
    createProcessInstanceDto: CreateProcessInstanceDto,
  ): Promise<ProcessInstanceEntity> {
    const subjectType =
      createProcessInstanceDto.subjectType ?? PROCESS_SUBJECT_TYPE_WORKFLOW;
    const subjectId = createProcessInstanceDto.subjectId ?? 0;

    const entity = this.processInstanceRepository.create({
      ...createProcessInstanceDto,
      subjectType,
      subjectId,
    });
    const saved = await this.processInstanceRepository.save(entity);

    if (
      subjectType === PROCESS_SUBJECT_TYPE_WORKFLOW &&
      (createProcessInstanceDto.subjectId === undefined ||
        createProcessInstanceDto.subjectId === 0)
    ) {
      saved.subjectId = saved.processInstanceId;
      await this.processInstanceRepository.update(saved.processInstanceId, {
        subjectId: saved.processInstanceId,
      });
    }

    return saved;
  }

  /**
   * Retrieves all process instances with optional filters, pagination, and sorting.
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

    const canonical = canonicalListObjectTypeForEntity(ProcessInstanceEntity);

    const ctx: CatalogBackedDynamicListContext<ProcessInstanceEntity> = {
      repository: this.processInstanceRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'pi',
      rootEntityClass: ProcessInstanceEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['correlationId', 'status'],
      fallbackCoreFields: ProcessInstancesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: ProcessInstancesService.FALLBACK_EXPR,
      defaultSortCoreField: 'processInstanceId',
      tieBreakOrderBySql: 'pi.processInstanceId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        if (
          typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
        ) {
          return row.catalogTenantId;
        }
        if (typeof row.tenantId === 'number' && row.tenantId > 0) {
          return row.tenantId;
        }
        return null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        if (typeof row.tenantId === 'number' && row.tenantId > 0) {
          qb.andWhere('pi.tenantId = :piTenantId', {
            piTenantId: row.tenantId,
          });
        }
        if (row.subjectType) {
          qb.andWhere('pi.subjectType = :piSubjectType', {
            piSubjectType: row.subjectType,
          });
        }
        if (typeof row.subjectId === 'number' && row.subjectId > 0) {
          qb.andWhere('pi.subjectId = :piSubjectId', {
            piSubjectId: row.subjectId,
          });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Process instance configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: processInstances, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (processInstances.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: processInstances,
      processInstanceRecords: processInstances,
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

  /**
   * Retrieves a single process instance by ID.
   */
  async findOne(userId: number, id: number): Promise<ProcessInstanceEntity> {
    const processInstance = await this.processInstanceRepository.findOne({
      where: { processInstanceId: id },
      relations: ['processTemplate', 'tenant', 'createdByUser'],
    });

    if (!processInstance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    return processInstance;
  }

  /**
   * Updates an existing process instance record.
   */
  async update(
    userId: number,
    id: number,
    updateProcessInstanceDto: UpdateProcessInstanceDto,
  ): Promise<UpdateResult> {
    const processInstance = await this.processInstanceRepository.findOneBy({
      processInstanceId: id,
    });

    if (!processInstance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    const { processInstanceId: _omit, ...patch } = updateProcessInstanceDto;
    return await this.processInstanceRepository.update(
      id,
      patch as QueryDeepPartialEntity<ProcessInstanceEntity>,
    );
  }

  /**
   * Deletes a process instance record by ID.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.processInstanceRepository.delete({
      processInstanceId: id,
    });
  }
}
