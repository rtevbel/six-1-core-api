import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepTriggerConditionSubmissionEntity } from './entities/process_template_step_trigger_condition_submission.entity';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/create-process_template_step_trigger_condition_submission.dto';
import { UpdateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/update-process_template_step_trigger_condition_submission.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
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
export class ProcessTemplateStepTriggerConditionSubmissionsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'stepTriggerConditionSubmissionId',
    'stepTriggerConditionId',
    'status',
    'reviewedBy',
    'createdBy',
    'createdAt',
    'reviewedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    stepTriggerConditionSubmissionId: 'ptstcs.stepTriggerConditionSubmissionId',
    stepTriggerConditionId: 'ptstcs.stepTriggerConditionId',
    status: 'ptstcs.status',
    reviewedBy: 'ptstcs.reviewedBy',
    createdBy: 'ptstcs.createdBy',
    createdAt: 'ptstcs.createdAt',
    reviewedAt: 'ptstcs.reviewedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepTriggerConditionSubmissionEntity)
    private readonly submissionRepository: Repository<ProcessTemplateStepTriggerConditionSubmissionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new submission record.
   */
  async create(
    userId: number,
    createSubmissionDto: CreateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<ProcessTemplateStepTriggerConditionSubmissionEntity> {
    const submission = this.submissionRepository.create(createSubmissionDto);
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
      ProcessTemplateStepTriggerConditionSubmissionEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepTriggerConditionSubmissionEntity> =
      {
        repository: this.submissionRepository,
        configObjectsService: this.configObjectsService,
        canonicalObjectType: canonical,
        rootAlias: 'ptstcs',
        rootEntityClass: ProcessTemplateStepTriggerConditionSubmissionEntity,
        denyCatalogCanonicalType: canonical,
        searchCorePropertyNames: ['status'],
        fallbackCoreFields:
          ProcessTemplateStepTriggerConditionSubmissionsService.FALLBACK_FIELDS,
        fallbackCoreColumnExpressions:
          ProcessTemplateStepTriggerConditionSubmissionsService.FALLBACK_EXPR,
        defaultSortCoreField: 'stepTriggerConditionSubmissionId',
        tieBreakOrderBySql: 'ptstcs.stepTriggerConditionSubmissionId',
        catalogTenantResolver: (f) => {
          const row = f as FiltersDto;
          return typeof row.catalogTenantId === 'number' &&
            row.catalogTenantId > 0
            ? row.catalogTenantId
            : null;
        },
        applyMandatoryScope: (qb, filters) => {
          const row = filters as FiltersDto;
          qb.andWhere('ptstcs.stepTriggerConditionId = :ptstcsTcId', {
            ptstcsTcId: row.stepTriggerConditionId,
          });
        },
        schemaMissingForRelatedFiltersMessage:
          'Process template step trigger condition submission configuration schema is required for related list filters.',
        maxPageSize: 10,
      };

    const { rows: submissions, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (submissions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: submissions,
      processTemplateStepTriggerConditionSubmissionRecords: submissions,
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
  ): Promise<ProcessTemplateStepTriggerConditionSubmissionEntity> {
    const submission = await this.submissionRepository.findOne({
      where: { stepTriggerConditionSubmissionId: id },
      relations: ['stepTriggerCondition', 'reviewedByUser'],
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
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
    updateSubmissionDto: UpdateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<UpdateResult> {
    const submission = await this.submissionRepository.findOneBy({
      stepTriggerConditionSubmissionId: id,
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
        ),
      );
    }

    return await this.submissionRepository.update(id, updateSubmissionDto);
  }

  /**
   * Deletes a submission record by ID.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.submissionRepository.delete({
      stepTriggerConditionSubmissionId: id,
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
