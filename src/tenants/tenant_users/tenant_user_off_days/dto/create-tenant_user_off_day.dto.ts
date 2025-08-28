import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsTodayOrLater } from '../../../../common/validators/is-today-or-later.validator';

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
   * Date of the off day.
   *
   * - Required field.
   * - Must be a valid and today or later date.
   *
   * @type {Date}
   */
  @IsDateString()
  @IsNotEmpty()
  @IsTodayOrLater({ message: 'offDate must be today or later' })
  offDate!: string;

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
  @MaxLength(255)
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
