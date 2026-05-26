import { Injectable } from '@nestjs/common';
import {
  Brackets,
  In,
  Repository,
  UpdateResult,
  DeleteResult,
  SelectQueryBuilder,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CategoryDescriptionEntity } from './entities/category-description.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FiltersDto } from './dto/filters.dto';
import { CategoryListResponseDto } from './dto/category-list-response.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';
import { appendParameterizedListFilterPredicate } from '../config_objects/list-query/append-parameterized-list-filter-predicate';
import { inferListFilterFieldTypeFromColumn } from '../config_objects/list-query/list-filter-field-type';

@Injectable()
export class CategoriesService {
  /** Core columns allowed for structured list filters on categories. */
  private static readonly LIST_CORE_FILTER_FIELDS = new Set([
    'categoryId',
    'tenantId',
    'statusId',
    'groupName',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ]);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(CategoryDescriptionEntity)
    private readonly categoryDescriptionRepository: Repository<CategoryDescriptionEntity>,
  ) {}

  /**
   * Creates a new category record.
   * @param userId - ID of the user creating the record.
   * @param createCategoryDto - Data Transfer Object containing category details.
   * @returns The created CategoryEntity.
   */
  async create(
    userId: number,
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    if (!createCategoryDto.tenantId) {
      createCategoryDto.tenantId = 1; // Default tenant ID for system categories
    }
    return await this.categoryRepository.save(
      this.categoryRepository.create(createCategoryDto),
    );
  }

  /**
   * Retrieves all categories with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of categories and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<CategoryListResponseDto> {
    if (filtersDto.sortSource === 'meta') {
      throw new RpcException(
        'Category list does not support sortSource "meta"; use "core".',
      );
    }
    if (filtersDto.includeMeta) {
      throw new RpcException(
        'Category list does not support includeMeta; categories have no meta JSON row.',
      );
    }
    for (const clause of filtersDto.filters ?? []) {
      if (clause.source !== 'core') {
        throw new RpcException(
          `Category list filters support source "core" only (received "${clause.source}").`,
        );
      }
    }

    const qb = this.createFilteredCategoriesQuery(filtersDto);

    const [categoriesBare, total] = await qb.getManyAndCount();

    if (categoriesBare.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CategoryEntity.name,
        ),
      );
    }

    const ids = categoriesBare.map((c) => c.categoryId);
    const orderIndex = new Map(ids.map((id, idx) => [id, idx]));
    const categories = (
      await this.categoryRepository.find({
        where: { categoryId: In(ids) },
        relations: ['descriptions'],
      })
    ).sort(
      (a, b) =>
        (orderIndex.get(a.categoryId) ?? 0) -
        (orderIndex.get(b.categoryId) ?? 0),
    );

    const pagination = this.buildPagination(filtersDto, total);

    return {
      items: categories,
      categoryRecords: categories,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single category by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the category to retrieve.
   * @returns The CategoryEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({
      where: { categoryId: id },
      relations: ['descriptions'],
    });

    if (!category) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CategoryEntity.name,
        ),
      );
    }

    return category;
  }

  /**
   * Updates an existing category record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the category to update.
   * @param updateCategoryDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<UpdateResult> {
    const category = await this.categoryRepository.findOneByOrFail({
      categoryId: id,
    });

    if (!category) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CategoryEntity.name,
        ),
      );
    }

    const { descriptions, ...categoryUpdateData } = updateCategoryDto;

    if (descriptions) {
      // Fetch existing descriptions from the database for the given category
      const existingDescriptions =
        await this.categoryDescriptionRepository.find({
          where: { categoryId: id },
        });

      // Extract IDs from the request descriptions
      const requestDescriptionIds = descriptions
        .filter((description: any) => description.categoryDescriptionId)
        .map((description: any) => description.categoryDescriptionId);

      // Remove descriptions from the database that are not part of the request
      const descriptionsToRemove = existingDescriptions.filter(
        (existingDescription) =>
          !requestDescriptionIds.includes(
            existingDescription.categoryDescriptionId,
          ),
      );

      for (const descriptionToRemove of descriptionsToRemove) {
        await this.categoryDescriptionRepository.remove(descriptionToRemove);
      }

      // Process the descriptions from the request
      for (const description of descriptions) {
        if ((description as any).categoryDescriptionId) {
          // Update existing description
          await this.categoryDescriptionRepository.update(
            (description as any).categoryDescriptionId,
            description,
          );
        } else {
          // Add new description
          description.categoryId = id;
          await this.categoryDescriptionRepository.save(
            this.categoryDescriptionRepository.create(description),
          );
        }
      }
    }

    return await this.categoryRepository.update(id, categoryUpdateData);
  }

  /**
   * Deletes a category record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the category to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.categoryRepository.delete({ categoryId: id });
  }

  /**
   * Builds a query for category rows with search, structured core filters, sort, and pagination.
   * Descriptions are loaded in {@link findAll} after pagination to avoid inflated counts.
   */
  private createFilteredCategoriesQuery(
    filtersDto: FiltersDto,
  ): SelectQueryBuilder<CategoryEntity> {
    const qb = this.categoryRepository.createQueryBuilder('cat');

    const rawSearch = filtersDto.search?.trim();
    if (rawSearch) {
      const search = `%${rawSearch}%`;
      qb.andWhere(
        new Brackets((wb) => {
          wb.where('cat.groupName LIKE :search', { search }).orWhere(
            `EXISTS (SELECT 1 FROM category_descriptions cd WHERE cd.category_id = cat.category_id AND (cd.name LIKE :search OR cd.description LIKE :search))`,
            { search },
          );
        }),
      );
    }

    for (const [index, clause] of (filtersDto.filters ?? []).entries()) {
      if (!CategoriesService.LIST_CORE_FILTER_FIELDS.has(clause.field)) {
        throw new RpcException(
          `Unsupported core filter field: ${clause.field}`,
        );
      }
      const column = this.categoryRepository.metadata.findColumnWithPropertyName(
        clause.field,
      );
      if (!column) {
        throw new RpcException(`Unknown core filter field: ${clause.field}`);
      }
      appendParameterizedListFilterPredicate(
        qb as SelectQueryBuilder<object>,
        `cat.${column.propertyName}`,
        {
          operator: clause.operator,
          value: clause.value,
          logicalField: clause.field,
          fieldType: inferListFilterFieldTypeFromColumn(column),
        },
        `catflt_${index}`,
      );
    }

    const sortBy = filtersDto.sortBy ?? 'categoryId';
    const sortColumn =
      this.categoryRepository.metadata.findColumnWithPropertyName(sortBy);
    if (!sortColumn) {
      throw new RpcException(`Unsupported sort field: ${sortBy}`);
    }
    const sortOrder = filtersDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`cat.${sortColumn.propertyName}`, sortOrder);

    const page =
      filtersDto.page && filtersDto.page > 0 ? filtersDto.page : 1;
    let limit =
      filtersDto.limit && filtersDto.limit > 0 ? filtersDto.limit : 10;
    limit = Math.min(limit, 10);
    qb.skip((page - 1) * limit).take(limit);

    return qb;
  }

  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const limit = filtersDto.limit || 10;
    return {
      total,
      page: filtersDto.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
