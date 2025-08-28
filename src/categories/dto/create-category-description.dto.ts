import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Create category description DTO class.
 *
 * Data transfer object for creating a category description.
 */
export class CreateCategoryDescriptionDto {
  /**
   * The ID of the category.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  categoryId!: number;

  /**
   * The language ID for the description.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  languageId!: number;

  /**
   * The name of the category.
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length is 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  name!: string;

  /**
   * The description of the category.
   *
   * - Optional field.
   * - Must be a string.
   * - Sanitized to remove harmful HTML tags.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => sanitizeHtml(value.trim()))
  description?: string;
}
