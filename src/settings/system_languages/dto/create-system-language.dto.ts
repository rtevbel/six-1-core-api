import { IsBoolean, IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * Create system language DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a system language.
 */
export class CreateSystemLanguageDto {
  /**
   * Human-readable language name like English, Italian, etc.
   *
   * - Required field.
   * - Must be a string.
   * - Must be unique.
   *
   * @type {string}
   */
  @IsString()
  name!: string;

  /**
   * Language code like "en".
   *
   * - Required field.
   * - Must be a string.
   * - Must be unique.
   *
   * @type {string}
   */
  @IsString()
  langCode!: string;

  /**
   * Indicates whether the language is active.
   *
   * - Optional field.
   * - Must be a boolean.
   * - Default value is true.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
