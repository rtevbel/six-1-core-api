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
 * Create role description DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a role description.
 */
export class CreateRoleDescriptionDto {
  /**
   * The ID of the role.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  role_id!: number;

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
  language_id!: number;

  /**
   * The name of the role.
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length is 50 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(50)
  name!: string;

  /**
   * The description of the role.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length is 65535 characters.
   * - Sanitized to remove harmful HTML tags.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(65535)
  @Transform(({ value }) => sanitizeHtml(value))
  description?: string;
}
