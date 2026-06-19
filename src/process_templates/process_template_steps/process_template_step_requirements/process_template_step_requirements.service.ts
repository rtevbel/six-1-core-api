import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';
import { CreateProcessTemplateStepRequirementDto } from './dto/create-process_template_step_requirement.dto';
import { UpdateProcessTemplateStepRequirementDto } from './dto/update-process_template_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
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
import { ProcessTemplateStepObjectBindingEntity } from '../process_template_step_object_bindings/entities/process_template_step_object_binding.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { ConfigObjectFieldEntity } from '../../../config_objects/entities/config_object_field.entity';
import { ProcessFeatureFlagsService } from '../../../automation/config/process-feature-flags.service';
import {
  assertProcessTemplateStepRequirementAuthoringAllowed,
  suggestRequirementToBinding,
  type RequirementToBindingSuggestion,
  type StepBindingFieldSnapshot,
} from './process-step-requirement-authoring.validation';
import { PROCESS_STEP_REQUIREMENT_POLICY_DOC_PATH } from './process-step-requirement-policy.constants';

@Injectable()
export class ProcessTemplateStepRequirementsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'processTemplateStepRequirementId',
    'processTemplateStepId',
    'requirementType',
    'requirementKey',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    processTemplateStepRequirementId: 'ptsr.processTemplateStepRequirementId',
    processTemplateStepId: 'ptsr.processTemplateStepId',
    requirementType: 'ptsr.requirementType',
    requirementKey: 'ptsr.requirementKey',
    createdBy: 'ptsr.createdBy',
    updatedBy: 'ptsr.updatedBy',
    createdAt: 'ptsr.createdAt',
    updatedAt: 'ptsr.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepRequirementEntity)
    private readonly processTemplateStepRequirementRepository: Repository<ProcessTemplateStepRequirementEntity>,
    @InjectRepository(ProcessTemplateStepObjectBindingEntity)
    private readonly bindingRepository: Repository<ProcessTemplateStepObjectBindingEntity>,
    @InjectRepository(ConfigObjectEntity)
    private readonly configObjectRepository: Repository<ConfigObjectEntity>,
    @InjectRepository(ConfigObjectFieldEntity)
    private readonly configObjectFieldRepository: Repository<ConfigObjectFieldEntity>,
    private readonly configObjectsService: ConfigObjectsService,
    private readonly processFlags: ProcessFeatureFlagsService,
  ) {}

  /**
   * Creates a new process template step requirement record.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepRequirementDto,
  ): Promise<ProcessTemplateStepRequirementEntity> {
    await this.assertAuthoringPolicy({
      processTemplateStepId: createDto.processTemplateStepId,
      requirementType: createDto.requirementType,
      requirementKey: createDto.requirementKey,
      jsonSchema: createDto.jsonSchema,
    });

    const requirement =
      this.processTemplateStepRequirementRepository.create(createDto);
    return await this.processTemplateStepRequirementRepository.save(
      requirement,
    );
  }

  /**
   * Retrieves all process template step requirements with optional filters, pagination, and sorting.
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
      ProcessTemplateStepRequirementEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepRequirementEntity> =
      {
        repository: this.processTemplateStepRequirementRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptsr',
        rootEntityClass: ProcessTemplateStepRequirementEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['requirementType', 'requirementKey'],
        fallbackCoreFields:
          ProcessTemplateStepRequirementsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepRequirementsService.FALLBACK_EXPR,
        defaultSortCoreField: 'processTemplateStepRequirementId',
        tieBreakOrderBySql: 'ptsr.processTemplateStepRequirementId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptsr.processTemplateStepId = :ptsrStepId', {
            ptsrStepId: row.processTemplateStepId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step requirement configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: requirements, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: requirements || [],
      processTemplateStepRequirementRecords: requirements || [],
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
      requirementPolicyGuidance: PROCESS_STEP_REQUIREMENT_POLICY_DOC_PATH,
      requirementGatePolicyEnforced:
        this.processFlags.isStepRequirementGatePolicyEnabled(),
    };
  }

  /**
   * Retrieves a single process template step requirement by ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepRequirementEntity> {
    const requirement =
      await this.processTemplateStepRequirementRepository.findOne({
        where: { processTemplateStepRequirementId: id },
        relations: ['processTemplateStep'],
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepRequirement',
        ),
      );
    }

    return requirement;
  }

  /**
   * Updates an existing process template step requirement record.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepRequirementDto,
  ): Promise<UpdateResult> {
    const requirement =
      await this.processTemplateStepRequirementRepository.findOneBy({
        processTemplateStepRequirementId: id,
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepRequirementEntity.name,
        ),
      );
    }

    await this.assertAuthoringPolicy({
      processTemplateStepId:
        updateDto.processTemplateStepId ?? requirement.processTemplateStepId,
      requirementType: updateDto.requirementType ?? requirement.requirementType,
      requirementKey: updateDto.requirementKey ?? requirement.requirementKey,
      jsonSchema: updateDto.jsonSchema ?? requirement.jsonSchema,
    });

    return await this.processTemplateStepRequirementRepository.update(id, {
      ...updateDto,
      updatedBy: userId,
    });
  }

  /**
   * Deletes a process template step requirement record by ID.
   */
  async remove(
    userId: number,
    processTemplateStepId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processTemplateStepRequirementRepository.delete({
      processTemplateStepRequirementId: id,
      processTemplateStepId: processTemplateStepId,
    });
  }

  /**
   * Suggests object binding replacements for legacy field-form requirements on a step.
   */
  async suggestBindingsForStep(
    processTemplateStepId: number,
    tenantId?: number,
  ): Promise<RequirementToBindingSuggestion[]> {
    const requirements =
      await this.processTemplateStepRequirementRepository.find({
        where: { processTemplateStepId },
        order: { processTemplateStepRequirementId: 'ASC' },
      });

    const bindings = await this.loadStepBindingSnapshots(processTemplateStepId);
    const tenantObjects = tenantId
      ? await this.loadTenantConfigObjectSnapshots(tenantId)
      : undefined;

    const suggestions: RequirementToBindingSuggestion[] = [];
    for (const requirement of requirements) {
      const suggestion = suggestRequirementToBinding({
        processTemplateStepRequirementId:
          requirement.processTemplateStepRequirementId,
        processTemplateStepId: requirement.processTemplateStepId,
        requirementType: requirement.requirementType,
        requirementKey: requirement.requirementKey,
        jsonSchema: requirement.jsonSchema,
        bindings,
        tenantConfigObjects: tenantObjects,
      });
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Suggests an object binding replacement for one requirement row.
   */
  async suggestBindingForRequirement(
    processTemplateStepRequirementId: number,
    tenantId?: number,
  ): Promise<RequirementToBindingSuggestion | null> {
    const requirement =
      await this.processTemplateStepRequirementRepository.findOne({
        where: { processTemplateStepRequirementId },
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepRequirement',
        ),
      );
    }

    const bindings = await this.loadStepBindingSnapshots(
      requirement.processTemplateStepId,
    );
    const tenantObjects = tenantId
      ? await this.loadTenantConfigObjectSnapshots(tenantId)
      : undefined;

    return suggestRequirementToBinding({
      processTemplateStepRequirementId:
        requirement.processTemplateStepRequirementId,
      processTemplateStepId: requirement.processTemplateStepId,
      requirementType: requirement.requirementType,
      requirementKey: requirement.requirementKey,
      jsonSchema: requirement.jsonSchema,
      bindings,
      tenantConfigObjects: tenantObjects,
    });
  }

  private async assertAuthoringPolicy(input: {
    processTemplateStepId: number;
    requirementType: string;
    requirementKey: string;
    jsonSchema: unknown;
  }): Promise<void> {
    if (!this.processFlags.isStepRequirementGatePolicyEnabled()) {
      return;
    }

    const bindings = await this.loadStepBindingSnapshots(input.processTemplateStepId);
    assertProcessTemplateStepRequirementAuthoringAllowed(input, bindings);
  }

  private async loadStepBindingSnapshots(
    processTemplateStepId: number,
  ): Promise<StepBindingFieldSnapshot[]> {
    const bindings = await this.bindingRepository.find({
      where: { processTemplateStepId },
      relations: ['configObject'],
      order: { orderIndex: 'ASC', bindingId: 'ASC' },
    });

    const snapshots: StepBindingFieldSnapshot[] = [];
    for (const binding of bindings) {
      const fieldKeys = await this.loadFieldKeys(binding.configObjectId);
      snapshots.push({
        configObjectId: binding.configObjectId,
        objectType: binding.configObject?.objectType ?? '',
        fieldKeys,
      });
    }

    return snapshots;
  }

  private async loadTenantConfigObjectSnapshots(
    tenantId: number,
  ): Promise<
    Array<{ configObjectId: number; objectType: string; fieldKeys: string[] }>
  > {
    const objects = await this.configObjectRepository
      .createQueryBuilder('co')
      .innerJoin('co.templateSet', 'ts')
      .where('ts.tenant_id = :tenantId', { tenantId })
      .getMany();

    const snapshots: Array<{
      configObjectId: number;
      objectType: string;
      fieldKeys: string[];
    }> = [];

    for (const obj of objects) {
      snapshots.push({
        configObjectId: obj.configObjectId,
        objectType: obj.objectType,
        fieldKeys: await this.loadFieldKeys(obj.configObjectId),
      });
    }

    return snapshots;
  }

  private async loadFieldKeys(configObjectId: number): Promise<string[]> {
    const rows = await this.configObjectFieldRepository.find({
      where: { configObjectId },
      select: ['fieldKey'],
      order: { fieldKey: 'ASC' },
    });
    return rows.map((row) => row.fieldKey);
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
