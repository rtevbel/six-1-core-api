import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepActionEntity } from './entities/process_template_step_action.entity';
import { CreateProcessTemplateStepActionDto } from './dto/create-process_template_step_action.dto';
import { UpdateProcessTemplateStepActionDto } from './dto/update-process_template_step_action.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindOneProcessTemplateStepActionDto } from './dto/find-one-process_template_step_action.dto';
import { RemoveProcessTemplateStepActionDto } from './dto/remove-process_template_step_action.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { NO_RECORD_FOUND_MESSAGE } from '../../../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';
import {
  getEffectiveTenantId,
  isProcessTemplateStepTenantAccessible,
} from '../../../common/utils/tenant-scope.util';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { canonicalListObjectTypeForEntity } from '../../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../../config_objects/list-query/sor-bound-dynamic-list.executor';
import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { assertProcessTemplateStepActionAllowed } from './process-template-step-action.validation';
import {
  parseProcessStepActionConfig,
  type ProcessStepActionConfig,
} from '../../../automation/process-step-action.types';

@Injectable()
export class ProcessTemplateStepActionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'stepActionId',
    'processTemplateStepId',
    'actionType',
    'runOn',
    'orderIndex',
    'isActive',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    stepActionId: 'ptsa.stepActionId',
    processTemplateStepId: 'ptsa.processTemplateStepId',
    actionType: 'ptsa.actionType',
    runOn: 'ptsa.runOn',
    orderIndex: 'ptsa.orderIndex',
    isActive: 'ptsa.isActive',
    createdBy: 'ptsa.createdBy',
    updatedBy: 'ptsa.updatedBy',
    createdAt: 'ptsa.createdAt',
    updatedAt: 'ptsa.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepActionEntity)
    private readonly actionRepository: Repository<ProcessTemplateStepActionEntity>,
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly stepRepository: Repository<ProcessTemplateStepEntity>,
    @InjectRepository(ConfigObjectEntity)
    private readonly configObjectRepository: Repository<ConfigObjectEntity>,
    @InjectRepository(NotificationTemplateEntity)
    private readonly notificationTemplateRepository: Repository<NotificationTemplateEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    createDto: CreateProcessTemplateStepActionDto,
  ): Promise<ProcessTemplateStepActionEntity> {
    await assertProcessTemplateStepActionAllowed(
      this.stepRepository,
      this.configObjectRepository,
      this.notificationTemplateRepository,
      {
        processTemplateStepId: createDto.processTemplateStepId,
        actionType: createDto.actionType,
        runOn: createDto.runOn,
        config: createDto.config,
        tenantId: createDto.tenantId,
      },
    );

    const parsedConfig = parseProcessStepActionConfig(
      createDto.actionType,
      createDto.config,
    );
    if (!parsedConfig) {
      throw new RpcException('Invalid action config for action_type.');
    }

    const action = this.actionRepository.create({
      processTemplateStepId: createDto.processTemplateStepId,
      actionType: createDto.actionType,
      runOn: createDto.runOn,
      config: parsedConfig,
      orderIndex: createDto.orderIndex ?? 0,
      isActive: createDto.isActive ?? true,
      createdBy: createDto.createdBy ?? userId,
      updatedBy: createDto.updatedBy ?? userId,
    });

    return this.actionRepository.save(action);
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    await this.assertStepTenantScope(
      filtersDto.processTemplateStepId,
      filtersDto.tenantId,
    );

    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(
      ProcessTemplateStepActionEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepActionEntity> =
      {
        repository: this.actionRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptsa',
        rootEntityClass: ProcessTemplateStepActionEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['actionType', 'runOn'],
        fallbackCoreFields: ProcessTemplateStepActionsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepActionsService.FALLBACK_EXPR,
        defaultSortCoreField: 'stepActionId',
        tieBreakOrderBySql: 'ptsa.stepActionId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptsa.processTemplateStepId = :ptsaStepId', {
            ptsaStepId: row.processTemplateStepId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step action configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: actions, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: actions || [],
      processTemplateStepActionRecords: actions || [],
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    payload: number | FindOneProcessTemplateStepActionDto,
  ): Promise<ProcessTemplateStepActionEntity> {
    const { stepActionId, tenantId } = this.normalizeFindOnePayload(payload);

    const action = await this.actionRepository.findOne({
      where: { stepActionId },
      relations: ['processTemplateStep', 'processTemplateStep.processTemplate'],
    });

    if (!action) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepActionEntity.name,
        ),
      );
    }

    const templateTenantId =
      action.processTemplateStep?.processTemplate?.tenantId;
    if (
      !isProcessTemplateStepTenantAccessible(
        templateTenantId,
        getEffectiveTenantId(tenantId),
      )
    ) {
      throw new RpcException(
        'Process template step action is not accessible for this tenant',
      );
    }

    return action;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepActionDto,
  ): Promise<UpdateResult> {
    const existing = await this.actionRepository.findOne({
      where: { stepActionId: id },
      relations: ['processTemplateStep', 'processTemplateStep.processTemplate'],
    });
    if (!existing) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepActionEntity.name,
        ),
      );
    }

    const templateTenantId =
      existing.processTemplateStep?.processTemplate?.tenantId;
    if (
      !isProcessTemplateStepTenantAccessible(
        templateTenantId,
        getEffectiveTenantId(updateDto.tenantId),
      )
    ) {
      throw new RpcException(
        'Process template step action is not accessible for this tenant',
      );
    }

    const processTemplateStepId =
      updateDto.processTemplateStepId ?? existing.processTemplateStepId;
    const actionType = updateDto.actionType ?? existing.actionType;
    const runOn = updateDto.runOn ?? existing.runOn;
    const config = updateDto.config ?? existing.config;

    await assertProcessTemplateStepActionAllowed(
      this.stepRepository,
      this.configObjectRepository,
      this.notificationTemplateRepository,
      {
        processTemplateStepId,
        actionType,
        runOn,
        config,
        tenantId: updateDto.tenantId,
      },
    );

    const { stepActionId: _stepActionId, tenantId: _tenantId, ...patch } =
      updateDto;

    return this.actionRepository.update(id, {
      ...patch,
      updatedBy: userId,
    } as QueryDeepPartialEntity<ProcessTemplateStepActionEntity>);
  }

  async remove(
    userId: number,
    processTemplateStepId: number,
    id: number,
    tenantId?: number,
  ): Promise<DeleteResult> {
    await this.assertStepTenantScope(processTemplateStepId, tenantId);

    return this.actionRepository.delete({
      stepActionId: id,
      processTemplateStepId,
    });
  }

  private async assertStepTenantScope(
    processTemplateStepId: number,
    tenantId?: number,
  ): Promise<void> {
    const step = await this.stepRepository.findOne({
      where: { processTemplateStepId },
      relations: ['processTemplate'],
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    if (
      !isProcessTemplateStepTenantAccessible(
        step.processTemplate?.tenantId,
        getEffectiveTenantId(tenantId),
      )
    ) {
      throw new RpcException(
        'Process template step is not accessible for this tenant',
      );
    }
  }

  private normalizeFindOnePayload(
    payload: number | FindOneProcessTemplateStepActionDto,
  ): { stepActionId: number; tenantId?: number } {
    if (typeof payload === 'number') {
      return { stepActionId: payload };
    }
    return {
      stepActionId: payload.stepActionId,
      tenantId: payload.tenantId,
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
