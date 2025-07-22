import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

/**
 * Create tenant configurations DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant configurations.
 */
export class CreateTenantConfigurationsDto {
  /**
   * Tenant ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  /**
   * Timezone.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  timezone!: string;

  /**
   * Language ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  languageId!: number;

  /**
   * Default currency.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  defaultCurrency!: string;

  /**
   * Week start day.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  weekStartDay!: string;

  /**
   * Date format.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  dateFormat!: string;

  /**
   * Time format.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  timeFormat!: string;

  /**
   * Default task status.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  defaultTaskStatus!: string;

  /**
   * Notification preferences.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  notificationPreferences!: string;

  /**
   * Branding logo URL.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  brandingLogo!: string;

  /**
   * Two-factor authentication enabled.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
  twoFactorAuthEnabled!: boolean;

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
}
