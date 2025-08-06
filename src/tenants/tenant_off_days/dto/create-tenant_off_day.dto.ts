import { IsString, IsOptional, IsNumber, IsNotEmpty, IsDateString } from 'class-validator';
import { IsTodayOrLater } from '../../../common/validators/is-today-or-later.validator';

/**
 * Create tenant off days DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant off days.
 */
export class CreateTenantOffDaysDto {
  /**
   * Tenant ID associated with the off day.
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
   * Date of the off day.
   *
   * - Required field.
   * - Must be a valid and today or later date.
   *
   * @type {IsDateString}
   */
  @IsDateString()
  @IsNotEmpty()
  @IsTodayOrLater({ message: 'offDate must be today or later' })
  offDate!: string;

  /**
   * Description or reason for the off day.
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
   * ID of the user who created the off day.
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
   * ID of the user who last updated the off day.
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
