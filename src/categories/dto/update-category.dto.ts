import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateCategoryDescriptionDto } from './update-category-description.dto';
import { CreateCategoryDto } from './create-category.dto';
import { PartialType, OmitType } from '@nestjs/mapped-types';

/**
 * Update category DTO class.
 *
 * Data transfer object for updating a category.
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, [
    'descriptions',
    'updatedBy',
    'createdBy',
  ] as const),
) {
  /**
   * The ID of the category.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  categoryId!: number;

  /**
   * The ID of the tenant user who last updated the category.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;

  /**
   * List of updated category descriptions.
   *
   * - Optional field.
   * - Must be an array of `UpdateCategoryDescriptionDto`.
   *
   * @type {UpdateCategoryDescriptionDto[]}
   */
  @IsOptional()
  @IsArray()
  @Type(() => UpdateCategoryDescriptionDto)
  @ValidateNested({ each: true })
  descriptions?: UpdateCategoryDescriptionDto[];
}
