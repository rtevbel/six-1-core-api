import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepEntity } from './entities/process_template_step.entity';
import { ProcessTemplateStepDescriptionEntity } from './entities/process_template_step_description.entity';
import { CreateProcessTemplateStepDto } from './dto/create-process_template_step.dto';
import { UpdateProcessTemplateStepDto } from './dto/update-process_template_step.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class ProcessTemplateStepsService {
  private static readonly FALLBACK_FIELDS = new Set([
    'processTemplateStepId',
    'processTemplateId',
    'taskType',
    'stepOrder',
    'isOptional',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    processTemplateStepId: 'pts.processTemplateStepId',
    processTemplateId: 'pts.processTemplateId',
    taskType: 'pts.taskType',
    stepOrder: 'pts.stepOrder',
    isOptional: 'pts.isOptional',
    createdBy: 'pts.createdBy',
    updatedBy: 'pts.updatedBy',
    createdAt: 'pts.createdAt',
    updatedAt: 'pts.updatedAt',
  };

  constructor(
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly processTemplateStepRepository: Repository<ProcessTemplateStepEntity>,
    @InjectRepository(ProcessTemplateStepDescriptionEntity)
    private readonly processTemplateStepDescriptionRepository: Repository<ProcessTemplateStepDescriptionEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new process template step record.
   * @param userId - ID of the user creating the record.
   * @param createProcessTemplateStepDto - Data Transfer Object containing step details.
   * @returns The created ProcessTemplateStepEntity.
   */
  async create(
    userId: number,
    createProcessTemplateStepDto: CreateProcessTemplateStepDto,
  ): Promise<ProcessTemplateStepEntity> {
    this.assertCallProcessConfig(createProcessTemplateStepDto);
    const step = this.processTemplateStepRepository.create(
      createProcessTemplateStepDto,
    );
    return await this.processTemplateStepRepository.save(step);
  }

  /**
   * Retrieves all process template steps with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process template steps and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(
      ProcessTemplateStepEntity,
    );

    const ctx: CatalogBackedDynamicListContext<ProcessTemplateStepEntity> = {
      repository: this.processTemplateStepRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'pts',
      rootEntityClass: ProcessTemplateStepEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['taskType'],
      fallbackCoreFields: ProcessTemplateStepsService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: ProcessTemplateStepsService.FALLBACK_EXPR,
      defaultSortCoreField: 'processTemplateStepId',
      tieBreakOrderBySql: 'pts.processTemplateStepId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('pts.processTemplateId = :ptsProcessTemplateId', {
          ptsProcessTemplateId: row.processTemplateId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Process template step configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: steps, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!steps.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: steps,
      processTemplateStepRecords: steps,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single process template step by ID.
   */
  async findOne(
    userId: number,
    processTemplateId: number,
    id: number,
  ): Promise<ProcessTemplateStepEntity> {
    const step = await this.processTemplateStepRepository.findOne({
      where: {
        processTemplateStepId: id,
        processTemplateId,
      },
      relations: ['descriptions'],
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessTemplateStep'),
      );
    }

    return step;
  }

  /**
   * Updates an existing process template step record.
   */
  async update(
    userId: number,
    id: number,
    updateProcessTemplateStepDto: UpdateProcessTemplateStepDto,
  ): Promise<UpdateResult> {
    const step = await this.processTemplateStepRepository.findOneBy({
      processTemplateStepId: id,
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    const { descriptions, ...stepUpdateData } = updateProcessTemplateStepDto;

    this.assertCallProcessConfig({
      taskType: stepUpdateData.taskType ?? step.taskType,
      childTemplateId:
        stepUpdateData.childTemplateId ?? step.childTemplateId ?? undefined,
    });

    if (descriptions) {
      for (const description of descriptions) {
        if (description.processTemplateStepDescriptionId) {
          await this.processTemplateStepDescriptionRepository.update(
            description.processTemplateStepDescriptionId,
            description,
          );
        } else {
          description.processTemplateStepId = id;
          await this.processTemplateStepDescriptionRepository.save(
            this.processTemplateStepDescriptionRepository.create(description),
          );
        }
      }
    }

    return await this.processTemplateStepRepository.update(
      id,
      stepUpdateData as QueryDeepPartialEntity<ProcessTemplateStepEntity>,
    );
  }

  /**
   * Deletes a process template step record by ID.
   */
  async remove(
    userId: number,
    processTemplateId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processTemplateStepRepository.delete({
      processTemplateStepId: id,
      processTemplateId,
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

  /**
   * Retrieves all process template steps by process template id.
   */
  async findAllByProcessTemplateId(
    userId: number,
    processTemplateId: number,
  ): Promise<ProcessTemplateStepEntity[]> {
    const steps = await this.processTemplateStepRepository.find({
      where: { processTemplateId },
      relations: ['descriptions'],
    });

    if (steps.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    return steps;
  }

  private assertCallProcessConfig(dto: {
    taskType?: string;
    childTemplateId?: number | null;
  }): void {
    if (dto.taskType === 'call_process' && !dto.childTemplateId) {
      throw new RpcException(
        'childTemplateId is required when taskType is call_process',
      );
    }
  }
}
