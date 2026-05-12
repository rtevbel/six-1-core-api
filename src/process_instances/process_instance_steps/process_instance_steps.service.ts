import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepEntity } from './entities/process_instance_step.entity';
import { CreateProcessInstanceStepDto } from './dto/create-process_instance_step.dto';
import { UpdateProcessInstanceStepDto } from './dto/update-process_instance_step.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
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
export class ProcessInstanceStepsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'stepInstanceId',
    'processInstanceId',
    'processTemplateStepId',
    'name',
    'taskType',
    'stepOrder',
    'isOptional',
    'status',
    'blockedReason',
    'readyAt',
    'startedAt',
    'completedAt',
    'canceledAt',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    stepInstanceId: 'pis.stepInstanceId',
    processInstanceId: 'pis.processInstanceId',
    processTemplateStepId: 'pis.processTemplateStepId',
    name: 'pis.name',
    taskType: 'pis.taskType',
    stepOrder: 'pis.stepOrder',
    isOptional: 'pis.isOptional',
    status: 'pis.status',
    blockedReason: 'pis.blockedReason',
    readyAt: 'pis.readyAt',
    startedAt: 'pis.startedAt',
    completedAt: 'pis.completedAt',
    canceledAt: 'pis.canceledAt',
    createdAt: 'pis.createdAt',
    updatedAt: 'pis.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly processInstanceStepRepository: Repository<ProcessInstanceStepEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new process instance step record.
   */
  async create(
    userId: number,
    createProcessInstanceStepDto: CreateProcessInstanceStepDto,
  ): Promise<ProcessInstanceStepEntity> {
    const step = this.processInstanceStepRepository.create(
      createProcessInstanceStepDto,
    );
    return await this.processInstanceStepRepository.save(step);
  }

  /**
   * Retrieves all process instance steps with optional filters, pagination, and sorting.
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

    const canonical = canonicalListObjectTypeForEntity(
      ProcessInstanceStepEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessInstanceStepEntity> = {
      repository: this.processInstanceStepRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'pis',
      rootEntityClass: ProcessInstanceStepEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['name', 'status', 'taskType'],
      fallbackCoreFields: ProcessInstanceStepsService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: ProcessInstanceStepsService.FALLBACK_EXPR,
      defaultSortCoreField: 'stepInstanceId',
      tieBreakOrderBySql: 'pis.stepInstanceId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('pis.processInstanceId = :pisProcessInstanceId', {
          pisProcessInstanceId: row.processInstanceId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Process instance step configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: steps, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (steps.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: steps,
      processInstanceStepRecords: steps,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single process instance step by ID.
   */
  async findOne(
    userId: number,
    processInstanceId: number,
    id: number,
  ): Promise<ProcessInstanceStepEntity> {
    const step = await this.processInstanceStepRepository.findOne({
      where: {
        stepInstanceId: id,
        processInstanceId: processInstanceId,
      },
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessInstanceStep'),
      );
    }

    return step;
  }

  /**
   * Updates an existing process instance step record.
   */
  async update(
    userId: number,
    id: number,
    updateProcessInstanceStepDto: UpdateProcessInstanceStepDto,
  ): Promise<UpdateResult> {
    const step = await this.processInstanceStepRepository.findOneBy({
      stepInstanceId: id,
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepEntity.name,
        ),
      );
    }

    return await this.processInstanceStepRepository.update(
      id,
      updateProcessInstanceStepDto,
    );
  }

  /**
   * Deletes a process instance step record by ID.
   */
  async remove(
    userId: number,
    processInstanceId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processInstanceStepRepository.delete({
      stepInstanceId: id,
      processInstanceId: processInstanceId,
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
