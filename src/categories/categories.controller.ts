import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FiltersDto } from './dto/filters.dto';
import { CategoryEntity } from './entities/category.entity';
import { CategoryListResponseDto } from './dto/category-list-response.dto';
import { RequirePermissions } from '../authorization/authorization.decorator';

import {
  MICROSERVICE_CREATE_CATEGORY_PATTERN,
  MICROSERVICE_FIND_ALL_CATEGORY_PATTERN,
  MICROSERVICE_FIND_ONE_CATEGORY_PATTERN,
  MICROSERVICE_UPDATE_CATEGORY_PATTERN,
  MICROSERVICE_REMOVE_CATEGORY_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Handles the creation of a new category.
   * @param userId - ID of the user making the request.
   * @param createCategoryDto - Data transfer object containing category details.
   * @returns The created category entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_CATEGORY_PATTERN)
  @RequirePermissions('categories.create')
  @UsePipes(AppRpcValidationPipe)
  createCategory(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  /**
   * Retrieves all categories based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying categories.
   * @returns A list of categories matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_CATEGORY_PATTERN)
  @RequirePermissions('categories.read')
  @UsePipes(AppRpcValidationPipe)
  findAllCategories(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<CategoryListResponseDto | never> {
    return this.categoriesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single category by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the category to retrieve.
   * @returns The category entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_CATEGORY_PATTERN)
  @RequirePermissions('categories.read')
  findOneCategory(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<CategoryEntity | NotFoundException> {
    return this.categoriesService.findOne(userId, id);
  }

  /**
   * Updates an existing category.
   * @param userId - ID of the user making the request.
   * @param updateCategoryDto - Data transfer object containing updated category details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CATEGORY_PATTERN)
  @RequirePermissions('categories.update')
  @UsePipes(AppRpcValidationPipe)
  updateCategory(
    @Payload('userId') userId: number,
    @Payload('data') updateCategoryDto: UpdateCategoryDto,
  ): Promise<UpdateResult> {
    return this.categoriesService.update(
      userId,
      updateCategoryDto.categoryId,
      updateCategoryDto,
    );
  }

  /**
   * Deletes a category by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the category to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_CATEGORY_PATTERN)
  @RequirePermissions('categories.delete')
  removeCategory(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.categoriesService.remove(userId, id);
  }
}
