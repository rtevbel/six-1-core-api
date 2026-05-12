import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
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
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new process template step requirement record.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepRequirementDto,
  ): Promise<ProcessTemplateStepRequirementEntity> {
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
