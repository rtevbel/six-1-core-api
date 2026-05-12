import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepRequirementSubmissionEntity } from './entities/process_template_step_requirement_submission.entity';
import { CreateProcessTemplateStepRequirementSubmissionDto } from './dto/create-process_template_step_requirement_submission.dto';
import { UpdateProcessTemplateStepRequirementSubmissionDto } from './dto/update-process_template_step_requirement_submission.dto';
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
export class ProcessTemplateStepRequirementSubmissionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'stepRequirementSubmissionId',
    'processTemplateStepRequirementId',
    'status',
    'reviewedBy',
    'createdBy',
    'createdAt',
    'reviewedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    stepRequirementSubmissionId: 'ptsrs.stepRequirementSubmissionId',
    processTemplateStepRequirementId: 'ptsrs.processTemplateStepRequirementId',
    status: 'ptsrs.status',
    reviewedBy: 'ptsrs.reviewedBy',
    createdBy: 'ptsrs.createdBy',
    createdAt: 'ptsrs.createdAt',
    reviewedAt: 'ptsrs.reviewedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepRequirementSubmissionEntity)
    private readonly submissionRepository: Repository<ProcessTemplateStepRequirementSubmissionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new submission record.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepRequirementSubmissionDto,
  ): Promise<ProcessTemplateStepRequirementSubmissionEntity> {
    const submission = this.submissionRepository.create(createDto);
    return await this.submissionRepository.save(submission);
  }

  /**
   * Retrieves all submissions with optional filters, pagination, and sorting.
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
      ProcessTemplateStepRequirementSubmissionEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepRequirementSubmissionEntity> =
      {
        repository: this.submissionRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptsrs',
        rootEntityClass: ProcessTemplateStepRequirementSubmissionEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['status'],
        fallbackCoreFields:
          ProcessTemplateStepRequirementSubmissionsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepRequirementSubmissionsService.FALLBACK_EXPR,
        defaultSortCoreField: 'stepRequirementSubmissionId',
        tieBreakOrderBySql: 'ptsrs.stepRequirementSubmissionId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptsrs.processTemplateStepRequirementId = :ptsrsReqId', {
            ptsrsReqId: row.processTemplateStepRequirementId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step requirement submission configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: submissions, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (submissions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepRequirementSubmissionEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: submissions,
      submissions,
      processTemplateStepRequirementSubmissionRecords: submissions,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single submission by ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepRequirementSubmissionEntity> {
    const submission = await this.submissionRepository.findOne({
      where: { stepRequirementSubmissionId: id },
      relations: ['processTemplateStepRequirement', 'reviewedByUser'],
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepRequirementSubmissionEntity.name,
        ),
      );
    }

    return submission;
  }

  /**
   * Updates an existing submission record.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepRequirementSubmissionDto,
  ): Promise<UpdateResult> {
    const submission = await this.submissionRepository.findOneBy({
      stepRequirementSubmissionId: id,
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepRequirementSubmissionEntity.name,
        ),
      );
    }

    return await this.submissionRepository.update(id, updateDto);
  }

  /**
   * Deletes a submission record by ID.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.submissionRepository.delete({
      stepRequirementSubmissionId: id,
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
