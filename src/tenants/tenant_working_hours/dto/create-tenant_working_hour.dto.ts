import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';

/**
 * Create Tenant Working Hours DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant working hours.
 */
export class CreateTenantWorkingHoursDto {
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
   * Day of the week.
   *
   * - Required field.
   * - Must be one of the specified enum values.
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
   * Start time of working hours.
   *
   * - Required field.
   * - Must be a string in time format.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  /**
   * End time of working hours.
   *
   * - Required field.
   * - Must be a string in time format.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  /**
   * User ID who created the record.
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
   * User ID who updated the record.
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
