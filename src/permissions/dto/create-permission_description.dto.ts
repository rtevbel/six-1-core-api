import {
  IsInt,
  IsOptional,
  IsPositive,
  IsDate,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * Create permission description DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a permission description.
 */
export class CreatePermissionDescriptionDto {
  /**
   * The ID of the permission description.
   *
   * - Optional field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsInt()
  @IsNumber()
  permissionDescriptionId?: number;

  /**
   * The ID of the permission linked to this description.
   *
   * - Optional field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  permissionId!: number;

  /**
   * The ID of the language for this description.
   *
   * - Required field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsNumber()
  languageId!: number;

  /**
   * The name of the permission.
   *
   * - Required field.
   * - Must be a non-empty string.
   * - Maximum length: 100 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  name!: string;

  /**
   * The description of the permission.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsOptional()
  description?: string;

  /**
   * The group of the permission.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 100 characters.
   *
   * @type {string}
   */
  @IsOptional()
  permissionGroup?: string;

  /**
   * The creation timestamp of the permission description.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  /**
   * The update timestamp of the permission description.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}
