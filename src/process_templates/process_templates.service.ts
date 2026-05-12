import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';
import { FiltersDto } from './dto/filters.dto';
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

@Injectable()
export class ProcessTemplatesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'processTemplateId',
    'tenantId',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    processTemplateId: 'pt.processTemplateId',
    tenantId: 'pt.tenantId',
    createdBy: 'pt.createdBy',
    updatedBy: 'pt.updatedBy',
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
    return await this.processTemplateRepository.save(
      this.processTemplateRepository.create(createProcessTemplateDto),
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
      searchCorePropertyNames: [],
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
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        if (typeof row.tenantId === 'number' && row.tenantId > 0) {
          qb.andWhere('pt.tenantId = :ptTenantId', { ptTenantId: row.tenantId });
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
  async findOne(userId: number, id: number): Promise<ProcessTemplateEntity> {
    const processTemplate = await this.processTemplateRepository.findOne({
      where: { processTemplateId: id },
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
    const processTemplate =
      await this.processTemplateRepository.findOneByOrFail({
        processTemplateId: id,
      });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    const { descriptions, categories, ...processTemplateUpdateData } =
      updateProcessTemplateDto;

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
      processTemplateUpdateData,
    );
  }

  /**
   * Deletes a process template record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the process template to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.processTemplateRepository.delete({
      processTemplateId: id,
    });
  }
}
