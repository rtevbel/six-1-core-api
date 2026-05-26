import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepObjectBindingEntity } from './entities/process_template_step_object_binding.entity';
import { CreateProcessTemplateStepObjectBindingDto } from './dto/create-process_template_step_object_binding.dto';
import { UpdateProcessTemplateStepObjectBindingDto } from './dto/update-process_template_step_object_binding.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
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
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { assertProcessTemplateStepObjectBindingAllowed } from './process-template-step-object-binding.validation';
import { DEFAULT_COMPLETION_RULE } from '../../../automation/process-step-object-binding.constants';

@Injectable()
export class ProcessTemplateStepObjectBindingsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'bindingId',
    'processTemplateStepId',
    'configObjectId',
    'bindingMode',
    'orderIndex',
    'isMandatory',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    bindingId: 'ptsob.bindingId',
    processTemplateStepId: 'ptsob.processTemplateStepId',
    configObjectId: 'ptsob.configObjectId',
    bindingMode: 'ptsob.bindingMode',
    orderIndex: 'ptsob.orderIndex',
    isMandatory: 'ptsob.isMandatory',
    createdBy: 'ptsob.createdBy',
    updatedBy: 'ptsob.updatedBy',
    createdAt: 'ptsob.createdAt',
    updatedAt: 'ptsob.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepObjectBindingEntity)
    private readonly bindingRepository: Repository<ProcessTemplateStepObjectBindingEntity>,
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly stepRepository: Repository<ProcessTemplateStepEntity>,
    @InjectRepository(ConfigObjectEntity)
    private readonly configObjectRepository: Repository<ConfigObjectEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(
    userId: number,
    createDto: CreateProcessTemplateStepObjectBindingDto,
  ): Promise<ProcessTemplateStepObjectBindingEntity> {
    await assertProcessTemplateStepObjectBindingAllowed(
      this.stepRepository,
      this.configObjectRepository,
      {
        processTemplateStepId: createDto.processTemplateStepId,
        configObjectId: createDto.configObjectId,
        bindingMode: createDto.bindingMode,
      },
    );

    const binding = this.bindingRepository.create({
      ...createDto,
      completionRule: createDto.completionRule ?? DEFAULT_COMPLETION_RULE,
      isMandatory: createDto.isMandatory ?? true,
      orderIndex: createDto.orderIndex ?? 0,
      createdBy: createDto.createdBy ?? userId,
      updatedBy: createDto.updatedBy ?? userId,
    });

    return await this.bindingRepository.save(binding);
  }

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
      ProcessTemplateStepObjectBindingEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepObjectBindingEntity> =
      {
        repository: this.bindingRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptsob',
        rootEntityClass: ProcessTemplateStepObjectBindingEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['bindingMode', 'instanceLabelTemplate'],
        fallbackCoreFields:
          ProcessTemplateStepObjectBindingsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepObjectBindingsService.FALLBACK_EXPR,
        defaultSortCoreField: 'bindingId',
        tieBreakOrderBySql: 'ptsob.bindingId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptsob.processTemplateStepId = :ptsobStepId', {
            ptsobStepId: row.processTemplateStepId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step object binding configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: bindings, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: bindings || [],
      processTemplateStepObjectBindingRecords: bindings || [],
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepObjectBindingEntity> {
    const binding = await this.bindingRepository.findOne({
      where: { bindingId: id },
      relations: ['processTemplateStep', 'configObject'],
    });

    if (!binding) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepObjectBinding',
        ),
      );
    }

    return binding;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepObjectBindingDto,
  ): Promise<UpdateResult> {
    const existing = await this.bindingRepository.findOneBy({ bindingId: id });

    if (!existing) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepObjectBindingEntity.name,
        ),
      );
    }

    const processTemplateStepId =
      updateDto.processTemplateStepId ?? existing.processTemplateStepId;
    const configObjectId = updateDto.configObjectId ?? existing.configObjectId;
    const bindingMode = updateDto.bindingMode ?? existing.bindingMode;

    await assertProcessTemplateStepObjectBindingAllowed(
      this.stepRepository,
      this.configObjectRepository,
      { processTemplateStepId, configObjectId, bindingMode },
    );

    const { bindingId: _bindingId, ...patch } = updateDto;

    return await this.bindingRepository.update(id, {
      ...patch,
      updatedBy: userId,
    } as QueryDeepPartialEntity<ProcessTemplateStepObjectBindingEntity>);
  }

  async remove(
    userId: number,
    processTemplateStepId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.bindingRepository.delete({
      bindingId: id,
      processTemplateStepId,
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
