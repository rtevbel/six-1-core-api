import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementEntity } from './entities/process_instance_step_requirement.entity';
import { CreateProcessInstanceStepRequirementDto } from './dto/create-process_instance_step_requirement.dto';
import { UpdateProcessInstanceStepRequirementDto } from './dto/update-process_instance_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
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
export class ProcessInstanceStepRequirementsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'requirementInstanceId',
    'stepInstanceId',
    'processTemplateStepRequirementId',
    'requirementType',
    'requirementKey',
    'isMandatory',
    'status',
    'lastSubmissionId',
    'approvedAt',
    'evaluatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    requirementInstanceId: 'pisr.requirementInstanceId',
    stepInstanceId: 'pisr.stepInstanceId',
    processTemplateStepRequirementId: 'pisr.processTemplateStepRequirementId',
    requirementType: 'pisr.requirementType',
    requirementKey: 'pisr.requirementKey',
    isMandatory: 'pisr.isMandatory',
    status: 'pisr.status',
    lastSubmissionId: 'pisr.lastSubmissionId',
    approvedAt: 'pisr.approvedAt',
    evaluatedAt: 'pisr.evaluatedAt',
  };

  constructor(
    @InjectRepository(ProcessInstanceStepRequirementEntity)
    private readonly processInstanceStepRequirementRepository: Repository<ProcessInstanceStepRequirementEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new ProcessInstanceStepRequirement record.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepRequirementDto,
  ): Promise<ProcessInstanceStepRequirementEntity> {
    const requirement =
      this.processInstanceStepRequirementRepository.create(createDto);
    return await this.processInstanceStepRequirementRepository.save(
      requirement,
    );
  }

  /**
   * Finds all ProcessInstanceStepRequirement records based on filters.
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
      ProcessInstanceStepRequirementEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessInstanceStepRequirementEntity> =
      {
        repository: this.processInstanceStepRequirementRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'pisr',
        rootEntityClass: ProcessInstanceStepRequirementEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: [
          'requirementType',
          'requirementKey',
          'status',
        ],
        fallbackCoreFields:
          ProcessInstanceStepRequirementsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessInstanceStepRequirementsService.FALLBACK_EXPR,
        defaultSortCoreField: 'requirementInstanceId',
        tieBreakOrderBySql: 'pisr.requirementInstanceId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('pisr.stepInstanceId = :pisrStepInstanceId', {
            pisrStepInstanceId: row.stepInstanceId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process instance step requirement configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: requirements, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (requirements.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: requirements,
      processInstanceStepRequirementRecords: requirements,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Finds a single ProcessInstanceStepRequirement record by ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessInstanceStepRequirementEntity> {
    const requirement =
      await this.processInstanceStepRequirementRepository.findOne({
        where: { requirementInstanceId: id },
        relations: ['processInstanceStep', 'processTemplateStepRequirement'],
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessInstanceStepRequirement',
        ),
      );
    }

    return requirement;
  }

  /**
   * Updates a ProcessInstanceStepRequirement record by ID.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessInstanceStepRequirementDto,
  ): Promise<UpdateResult> {
    const requirement =
      await this.processInstanceStepRequirementRepository.findOneBy({
        requirementInstanceId: id,
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementEntity.name,
        ),
      );
    }

    return await this.processInstanceStepRequirementRepository.update(
      { requirementInstanceId: id },
      updateDto,
    );
  }

  /**
   * Deletes a ProcessInstanceStepRequirement record by ID.
   */
  async remove(
    userId: number,
    stepInstanceId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processInstanceStepRequirementRepository.delete({
      requirementInstanceId: id,
      stepInstanceId: stepInstanceId,
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
