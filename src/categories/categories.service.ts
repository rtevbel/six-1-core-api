import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
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

@Injectable()
export class CategoriesService {
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
    const findQuery = this.buildFindQuery(filtersDto);

    const [categories, total] =
      await this.categoryRepository.findAndCount(findQuery);

    if (categories.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CategoryEntity.name,
        ),
      );
    }

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

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['descriptions'], // Add the relationship for leftJoinAndSelect
    };

    // Apply search filter if provided
    if (filtersDto.search) {
      query.where = [
        { groupName: Like(`%${filtersDto.search}%`) },
        {
          descriptions: {
            name: Like(`%${filtersDto.search}%`),
            description: Like(`%${filtersDto.search}%`),
          },
        },
      ];
    }

    // Apply sorting if provided
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
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
