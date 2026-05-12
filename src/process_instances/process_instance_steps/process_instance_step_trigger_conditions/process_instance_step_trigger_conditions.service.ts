import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepTriggerEntity } from './entities/process_instance_step_trigger_condition.entity';
import { CreateProcessInstanceStepTriggerDto } from './dto/create-process_instance_step_trigger_condition.dto';
import { UpdateProcessInstanceStepTriggerDto } from './dto/update-process_instance_step_trigger_condition.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
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
export class ProcessInstanceStepTriggersService {
  private static readonly FALLBACK_FIELDS = new Set([
    'triggerInstanceId',
    'stepInstanceId',
    'processTemplateStepTriggerConditionId',
    'conditionType',
    'conditionKey',
    'status',
    'metAt',
    'lastEvalAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    triggerInstanceId: 'pist.triggerInstanceId',
    stepInstanceId: 'pist.stepInstanceId',
    processTemplateStepTriggerConditionId:
      'pist.processTemplateStepTriggerConditionId',
    conditionType: 'pist.conditionType',
    conditionKey: 'pist.conditionKey',
    status: 'pist.status',
    metAt: 'pist.metAt',
    lastEvalAt: 'pist.lastEvalAt',
  };

  constructor(
    @InjectRepository(ProcessInstanceStepTriggerEntity)
    private readonly triggerRepository: Repository<ProcessInstanceStepTriggerEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new process instance step trigger.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepTriggerDto,
  ): Promise<ProcessInstanceStepTriggerEntity> {
    const trigger = this.triggerRepository.create(createDto);
    return await this.triggerRepository.save(trigger);
  }

  /**
   * Retrieves all triggers with optional filters, pagination, and sorting.
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
      ProcessInstanceStepTriggerEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessInstanceStepTriggerEntity> =
      {
        repository: this.triggerRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'pist',
        rootEntityClass: ProcessInstanceStepTriggerEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['conditionType', 'conditionKey', 'status'],
        fallbackCoreFields: ProcessInstanceStepTriggersService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessInstanceStepTriggersService.FALLBACK_EXPR,
        defaultSortCoreField: 'triggerInstanceId',
        tieBreakOrderBySql: 'pist.triggerInstanceId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('pist.stepInstanceId = :pistStepInstanceId', {
            pistStepInstanceId: row.stepInstanceId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process instance step trigger configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: triggers, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (triggers.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepTriggerEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: triggers,
      processInstanceStepTriggerConditionRecords: triggers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single trigger by ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessInstanceStepTriggerEntity> {
    const trigger = await this.triggerRepository.findOne({
      where: { triggerInstanceId: id },
    });

    if (!trigger) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessInstanceStepTrigger',
        ),
      );
    }

    return trigger;
  }

  /**
   * Updates an existing trigger record.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessInstanceStepTriggerDto,
  ): Promise<UpdateResult> {
    const trigger = await this.triggerRepository.findOneBy({
      triggerInstanceId: id,
    });

    if (!trigger) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepTriggerEntity.name,
        ),
      );
    }

    return await this.triggerRepository.update(id, updateDto);
  }

  /**
   * Deletes a trigger record by ID.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.triggerRepository.delete({
      triggerInstanceId: id,
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
