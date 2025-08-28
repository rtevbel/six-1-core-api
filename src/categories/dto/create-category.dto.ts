import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCategoryDescriptionDto } from './create-category-description.dto';

/**
 * Create category DTO class.
 *
 * Data transfer object for creating a category.
 */
export class CreateCategoryDto {
  /**
   * The tenant ID linked to the category.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  tenantId!: number;

  /**
   * The status ID of the category.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  statusId!: number;

  /**
   * The group name of the category.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  groupName!: string;

  /**
   * The ID of the tenant user who created the category.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  createdBy!: number;

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
   * List of category descriptions.
   *
   * - Required field.
   * - Must be an array of `CreateCategoryDescriptionDto`.
   *
   * @type {CreateCategoryDescriptionDto[]}
   */
  @IsArray()
  @Type(() => CreateCategoryDescriptionDto)
  @ValidateNested({ each: true })
  descriptions!: CreateCategoryDescriptionDto[];
}
