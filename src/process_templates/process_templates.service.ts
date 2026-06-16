import { Injectable, Inject } from '@nestjs/common';
import {
  In,
  Repository,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { AJV } from '../automation/ajv.module';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';
import { FiltersDto } from './dto/filters.dto';
import { DeactivateProcessTemplateDto } from './dto/deactivate-process_template.dto';
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
import { canonicalListObjectTypeForEntity } from '../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';
import {
  getEffectiveTenantId,
  processTemplateWhereForTenantScope,
  resolveProcessTemplateStoredTenantId,
} from '../common/utils/tenant-scope.util';
import { FindOneProcessTemplateDto } from './dto/find-one-process_template.dto';
import { RemoveProcessTemplateDto } from './dto/remove-process_template.dto';
import { ValidateProcessTemplateContextDto } from './dto/validate-process_template_context.dto';
import {
  assertCompilableJsonSchema,
  validateContextAgainstSchema,
  type ContextSchemaValidationResult,
} from './process-template-context-schema.util';

@Injectable()
export class ProcessTemplatesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'processTemplateId',
    'tenantId',
    'createdBy',
    'updatedBy',
    'status',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    processTemplateId: 'pt.processTemplateId',
    tenantId: 'pt.tenantId',
    createdBy: 'pt.createdBy',
    updatedBy: 'pt.updatedBy',
    status: 'pt.status',
    createdAt: 'pt.createdAt',
    updatedAt: 'pt.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateEntity)
    private readonly processTemplateRepository: Repository<ProcessTemplateEntity>,
    @InjectRepository(ProcessTemplateDescriptionEntity)
    private readonly processTemplateDescriptionRepository: Repository<ProcessTemplateDescriptionEntity>,
    @InjectRepository(ProcessTemplateCategoryEntity)
    private readonly processTemplateCategoryRepository: Repository<ProcessTemplateCategoryEntity>,
    private readonly configObjectsService: ConfigObjectsService,
    @Inject(AJV)
    private readonly ajv: {
      compile: (schema: object) => (data: unknown) => boolean;
      errors?: unknown;
    },
  ) {}

  /**
   * Creates a new process template record.
   * @param userId - ID of the user creating the record.
   * @param createProcessTemplateDto - Data Transfer Object containing process template details.
   * @returns The created ProcessTemplateEntity.
   */
  async create(
    userId: number,
    createProcessTemplateDto: CreateProcessTemplateDto,
  ): Promise<ProcessTemplateEntity> {
    const { status, tenantId, contextSchema, ...rest } = createProcessTemplateDto;
    assertCompilableJsonSchema(this.ajv, contextSchema ?? undefined);
    return await this.processTemplateRepository.save(
      this.processTemplateRepository.create({
        ...rest,
        contextSchema: contextSchema ?? null,
        tenantId: resolveProcessTemplateStoredTenantId(tenantId),
        status: status ?? 'DRAFT',
      }),
    );
  }

  /**
   * Retrieves all process templates with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process templates and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(ProcessTemplateEntity);

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateEntity> = {
      repository: this.processTemplateRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'pt',
      rootEntityClass: ProcessTemplateEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['processTemplateId', 'tenantId', 'status'],
      fallbackCoreFields: ProcessTemplatesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: ProcessTemplatesService.FALLBACK_EXPR,
      defaultSortCoreField: 'processTemplateId',
      tieBreakOrderBySql: 'pt.processTemplateId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        if (
          typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
        ) {
          return row.catalogTenantId;
        }
        return typeof row.tenantId === 'number' && row.tenantId > 0
          ? row.tenantId
          : null;
      },
      augmentSearchRawOrClauses: () => [
        `EXISTS (SELECT 1 FROM process_template_descriptions pt_s_desc WHERE pt_s_desc.process_template_id = pt.processTemplateId AND (LOWER(pt_s_desc.name) LIKE LOWER(:_sorSearch) OR LOWER(COALESCE(pt_s_desc.description, '')) LIKE LOWER(:_sorSearch) OR CAST(pt_s_desc.language_id AS CHAR) LIKE LOWER(:_sorSearch)))`,
      ],
      hydrateRoots: (roots) => this.hydrateProcessTemplatesForList(roots),
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        if (typeof row.tenantId === 'number') {
          if (row.tenantId > 0) {
            qb.andWhere('pt.tenantId = :ptTenantId', {
              ptTenantId: row.tenantId,
            });
          } else if (row.tenantId === 0) {
            qb.andWhere('pt.tenantId = 0');
          }
        }
        if (row.status) {
          qb.andWhere('pt.status = :ptStatus', { ptStatus: row.status });
        } else if (row.statuses?.length) {
          qb.andWhere('pt.status IN (:...ptStatuses)', {
            ptStatuses: row.statuses,
          });
        }
      },
      schemaMissingForRelatedFiltersMessage:
        'Process template configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: processTemplates, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!processTemplates.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: processTemplates,
      processTemplateRecords: processTemplates,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateProcessTemplatesForList(
    roots: ProcessTemplateEntity[],
  ): Promise<ProcessTemplateEntity[]> {
    const ids = roots.map((row) => row.processTemplateId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.processTemplateRepository.find({
      where: { processTemplateId: In(ids) },
      relations: ['descriptions'],
    });
    const byId = new Map(loaded.map((row) => [row.processTemplateId, row]));
    return ids
      .map((id) => byId.get(id)!)
      .filter(Boolean) as ProcessTemplateEntity[];
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
   * Retrieves a single process template by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the process template to retrieve.
   * @returns The ProcessTemplateEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    payload: number | FindOneProcessTemplateDto,
  ): Promise<ProcessTemplateEntity> {
    const { processTemplateId, tenantId } =
      this.normalizeProcessTemplateIdPayload(payload);
    const effectiveTenantId = getEffectiveTenantId(tenantId);

    const processTemplate = await this.processTemplateRepository.findOne({
      where: processTemplateWhereForTenantScope(
        processTemplateId,
        effectiveTenantId,
      ),
      relations: [
        'descriptions',
        'categories',
        'categories.category.descriptions',
        'steps',
        'steps.descriptions',
      ],
    });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    return processTemplate;
  }

  /**
   * Validates a process start context payload against the template's `contextSchema`.
   * When no schema is defined, returns `{ valid: true, errors: [] }`.
   */
  async validateContext(
    userId: number,
    dto: ValidateProcessTemplateContextDto,
  ): Promise<ContextSchemaValidationResult> {
    const effectiveTenantId = getEffectiveTenantId(dto.tenantId);
    const template = await this.processTemplateRepository.findOne({
      where: processTemplateWhereForTenantScope(
        dto.processTemplateId,
        effectiveTenantId,
      ),
      select: ['processTemplateId', 'contextSchema'],
    });

    if (!template) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    if (!template.contextSchema) {
      return { valid: true, errors: [] };
    }

    return validateContextAgainstSchema(
      this.ajv,
      template.contextSchema,
      dto.context,
    );
  }

  /**
   * Updates an existing process template record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the process template to update.
   * @param updateProcessTemplateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProcessTemplateDto: UpdateProcessTemplateDto,
  ): Promise<UpdateResult> {
    const effectiveTenantId = getEffectiveTenantId(
      updateProcessTemplateDto.tenantId,
    );
    const processTemplate = await this.processTemplateRepository.findOne({
      where: processTemplateWhereForTenantScope(id, effectiveTenantId),
    });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    const { descriptions, categories, tenantId: _scopeTenantId, contextSchema, ...processTemplateUpdateData } =
      updateProcessTemplateDto;

    if (contextSchema !== undefined) {
      assertCompilableJsonSchema(this.ajv, contextSchema ?? undefined);
    }

    const updatePayload = {
      ...processTemplateUpdateData,
      ...(contextSchema !== undefined ? { contextSchema } : {}),
    };

    if (descriptions) {
      for (const description of descriptions) {
        if (description.processTemplateDescriptionId) {
          await this.processTemplateDescriptionRepository.update(
            description.processTemplateDescriptionId,
            description,
          );
        } else {
          description.processTemplateId = id;
          await this.processTemplateDescriptionRepository.save(
            this.processTemplateDescriptionRepository.create(description),
          );
        }
      }
    }

    if (categories) {
      await this.processTemplateCategoryRepository.delete({
        processTemplateId: id,
      });
      for (const category of categories) {
        category.processTemplateId = id;
        await this.processTemplateCategoryRepository.save(
          this.processTemplateCategoryRepository.create(category),
        );
      }
    }
    return await this.processTemplateRepository.update(
      id,
      updatePayload as QueryDeepPartialEntity<ProcessTemplateEntity>,
    );
  }

  /**
   * Deactivates (archives) a process template so it cannot be used for new processes.
   */
  async deactivate(
    userId: number,
    dto: DeactivateProcessTemplateDto,
  ): Promise<ProcessTemplateEntity> {
    const updatedBy = dto.updatedBy ?? userId;
    const effectiveTenantId = getEffectiveTenantId(dto.tenantId);
    const processTemplate = await this.processTemplateRepository.findOne({
      where: processTemplateWhereForTenantScope(
        dto.processTemplateId,
        effectiveTenantId,
      ),
    });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    processTemplate.status = 'ARCHIVED';
    processTemplate.updatedBy = updatedBy;
    return await this.processTemplateRepository.save(processTemplate);
  }

  /**
   * Deletes a process template record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the process template to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    payload: number | RemoveProcessTemplateDto,
  ): Promise<DeleteResult> {
    const { processTemplateId, tenantId } =
      this.normalizeProcessTemplateIdPayload(payload);
    const effectiveTenantId = getEffectiveTenantId(tenantId);

    const existing = await this.processTemplateRepository.findOne({
      where: processTemplateWhereForTenantScope(
        processTemplateId,
        effectiveTenantId,
      ),
    });

    if (!existing) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    return await this.processTemplateRepository.delete({
      processTemplateId,
    });
  }

  private normalizeProcessTemplateIdPayload(
    payload: number | FindOneProcessTemplateDto | RemoveProcessTemplateDto,
  ): { processTemplateId: number; tenantId?: number } {
    if (typeof payload === 'number') {
      return { processTemplateId: payload };
    }
    return {
      processTemplateId: payload.processTemplateId,
      tenantId: payload.tenantId,
    };
  }
}
