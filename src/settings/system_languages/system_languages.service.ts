import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemLanguageEntity } from './entities/system-language.entity';
import { CreateSystemLanguageDto } from './dto/create-system-language.dto';
import { UpdateSystemLanguageDto } from './dto/update-system-language.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
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
export class SystemLanguagesService {
  private static readonly FALLBACK_FIELDS = new Set([
    'languageId',
    'name',
    'langCode',
    'isActive',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    languageId: 'l.languageId',
    name: 'l.name',
    langCode: 'l.langCode',
    isActive: 'l.isActive',
  };

  constructor(
    @InjectRepository(SystemLanguageEntity)
    private readonly systemLanguageRepository: Repository<SystemLanguageEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new system language record.
   * @param userId - ID of the user creating the record.
   * @param createSystemLanguageDto - Data Transfer Object containing language details.
   * @returns The created SystemLanguageEntity.
   */
  async create(
    userId: number,
    createSystemLanguageDto: CreateSystemLanguageDto,
  ): Promise<SystemLanguageEntity> {
    return await this.systemLanguageRepository.save(
      this.systemLanguageRepository.create(createSystemLanguageDto),
    );
  }

  /**
   * Retrieves all system languages with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of languages and pagination details.
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

    const canonical = canonicalListObjectTypeForEntity(SystemLanguageEntity);

    const ctx: CatalogBackedDynamicListContext<SystemLanguageEntity> = {
      repository: this.systemLanguageRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'l',
      rootEntityClass: SystemLanguageEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['name', 'langCode'],
      fallbackCoreFields: SystemLanguagesService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: SystemLanguagesService.FALLBACK_EXPR,
      defaultSortCoreField: 'languageId',
      tieBreakOrderBySql: 'l.languageId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'System language configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: languages, total } =
      await executeCatalogBackedDynamicListQuery(ctx, filtersDto);

    if (!languages.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: languages,
      languages,
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
   * Retrieves a single system language by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the language to retrieve.
   * @returns The SystemLanguageEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<SystemLanguageEntity> {
    const language = await this.systemLanguageRepository.findOneByOrFail({
      languageId: id,
    });

    if (!language) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    return language;
  }

  /**
   * Updates an existing system language record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the language to update.
   * @param updateSystemLanguageDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateSystemLanguageDto: UpdateSystemLanguageDto,
  ): Promise<UpdateResult> {
    const language = await this.systemLanguageRepository.findOneByOrFail({
      languageId: id,
    });

    if (!language) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    return await this.systemLanguageRepository.update(
      id,
      updateSystemLanguageDto,
    );
  }

  /**
   * Deletes a system language record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the language to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.systemLanguageRepository.delete({ languageId: id });
  }
}
