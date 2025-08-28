import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDescriptionDto } from './create-category-description.dto';

/**
 * Update category description DTO class.
 *
 * Data transfer object for updating a category description.
 */
export class UpdateCategoryDescriptionDto extends PartialType(
  CreateCategoryDescriptionDto,
) {
  /**
   * The ID of the category description.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryDescriptionId?: number;
}
