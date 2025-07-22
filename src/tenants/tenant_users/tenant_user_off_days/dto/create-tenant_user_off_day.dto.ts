import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsString,
} from 'class-validator';

/**
 * Create tenant user off day DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user off days.
 */
export class CreateTenantUserOffDayDto {
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
   * Off day date.
   *
   * - Required field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsNotEmpty()
  offDate!: Date;

  /**
   * Description of the off day.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  description?: string;

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
