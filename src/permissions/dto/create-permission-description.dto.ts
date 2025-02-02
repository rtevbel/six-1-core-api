import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AppLanguagesEnum } from '../../common/enums/app-languages.enum';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Data Transfer Object (DTO) for creating a permission description.
 * 
 * @version 1.0.0
 * 
 * This DTO defines the structure and validation rules for creating 
 * a permission description in multiple languages.
 */
export class CreatePermissionDescriptionDto {
  
  /**
   * The language ID for the permission description.
   * 
   * @example 1 // English
   * 
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  language_id: number = AppLanguagesEnum.English;

  /**
   * The name of the permission.
   * 
   * - Must be a non-empty string.
   * - Trimmed to remove leading/trailing spaces.
   * - Maximum length: 100 characters.
   * 
   * @example "Edit User"
   * 
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  name: string = '';

  /**
   * Optional description of the permission.
   * 
   * - Maximum length: 65,535 characters.
   * - Sanitized to remove harmful HTML content.
   * 
   * @example "Allows the user to edit existing user profiles."
   * 
   * @type {string | undefined}
   */
  @IsOptional()
  @MaxLength(65535)
  @Transform(({ value }) => sanitizeHtml(value)) // Removes harmful HTML tags
  description?: string;
}
