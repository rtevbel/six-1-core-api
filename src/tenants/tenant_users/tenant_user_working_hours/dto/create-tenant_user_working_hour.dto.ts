import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';

/**
 * Create tenant user working hours DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user working hours.
 */
export class CreateTenantUserWorkingHoursDto {
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
   * Day of the week.
   *
   * - Required field.
   * - Must be one of the enum values.
   *
   * @type {string}
   */
  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  @IsNotEmpty()
  dayOfWeek!: string;

  /**
   * Start time.
   *
   * - Required field.
   * - Must be a valid time string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  /**
   * End time.
   *
   * - Required field.
   * - Must be a valid time string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  endTime!: string;

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
