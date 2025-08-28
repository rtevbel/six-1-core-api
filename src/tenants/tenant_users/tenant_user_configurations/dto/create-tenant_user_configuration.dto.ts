import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Create tenant user configuration DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user configurations.
 */
export class CreateTenantUserConfigurationDto {
  /**
   * Tenant user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserId!: number;

  /**
   * Timezone.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 50.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 50)
  timezone?: string;

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
   * Default currency.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 10.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 10)
  defaultCurrency?: string;

  /**
   * Week start day.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 10.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 10)
  weekStartDay?: string;

  /**
   * Date format.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 20.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 20)
  dateFormat?: string;

  /**
   * Time format.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 20.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 20)
  timeFormat?: string;

  /**
   * Notification preferences.
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 255.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @Length(1, 255)
  notificationPreferences?: string;

  /**
   * Created by user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  /**
   * Updated by user ID.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  updatedBy!: number;
}
