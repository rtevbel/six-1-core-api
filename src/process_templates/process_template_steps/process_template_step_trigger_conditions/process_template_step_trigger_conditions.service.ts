import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepTriggerConditionEntity } from './entities/process_template_step_trigger_condition.entity';
import { CreateProcessTemplateStepTriggerConditionDto } from './dto/create-process_template_step_trigger_condition.dto';
import { UpdateProcessTemplateStepTriggerConditionDto } from './dto/update-process_template_step_trigger_condition.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import { NO_RECORD_FOUND_MESSAGE } from '../../../common/constants';
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
export class ProcessTemplateStepTriggerConditionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'stepTriggerConditionId',
    'processTemplateStepId',
    'conditionType',
    'conditionKey',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    stepTriggerConditionId: 'ptstc.stepTriggerConditionId',
    processTemplateStepId: 'ptstc.processTemplateStepId',
    conditionType: 'ptstc.conditionType',
    conditionKey: 'ptstc.conditionKey',
    createdBy: 'ptstc.createdBy',
    updatedBy: 'ptstc.updatedBy',
    createdAt: 'ptstc.createdAt',
    updatedAt: 'ptstc.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepTriggerConditionEntity)
    private readonly triggerConditionRepository: Repository<ProcessTemplateStepTriggerConditionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new trigger condition record.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepTriggerConditionDto,
  ): Promise<ProcessTemplateStepTriggerConditionEntity> {
    const condition = this.triggerConditionRepository.create(createDto);
    return await this.triggerConditionRepository.save(condition);
  }

  /**
   * Retrieves all trigger conditions with optional filters, pagination, and sorting.
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
      ProcessTemplateStepTriggerConditionEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepTriggerConditionEntity> =
      {
        repository: this.triggerConditionRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptstc',
        rootEntityClass: ProcessTemplateStepTriggerConditionEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['conditionType', 'conditionKey'],
        fallbackCoreFields:
          ProcessTemplateStepTriggerConditionsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepTriggerConditionsService.FALLBACK_EXPR,
        defaultSortCoreField: 'stepTriggerConditionId',
        tieBreakOrderBySql: 'ptstc.stepTriggerConditionId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptstc.processTemplateStepId = :ptstcStepId', {
            ptstcStepId: row.processTemplateStepId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step trigger condition configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: conditions, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: conditions || [],
      processTemplateStepTriggerConditionRecords: conditions || [],
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single trigger condition by ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepTriggerConditionEntity> {
    const condition = await this.triggerConditionRepository.findOne({
      where: { stepTriggerConditionId: id },
    });

    if (!condition) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepTriggerCondition',
        ),
      );
    }

    return condition;
  }

  /**
   * Updates an existing trigger condition record.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepTriggerConditionDto,
  ): Promise<UpdateResult> {
    const condition = await this.triggerConditionRepository.findOneBy({
      stepTriggerConditionId: id,
    });

    if (!condition) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionEntity.name,
        ),
      );
    }

    return await this.triggerConditionRepository.update(id, updateDto);
  }

  /**
   * Deletes a trigger condition record by ID.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.triggerConditionRepository.delete({
      stepTriggerConditionId: id,
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
