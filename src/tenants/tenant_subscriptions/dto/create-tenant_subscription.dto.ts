import {
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsDate,
  IsDateString,
} from 'class-validator';
import {IsTodayOrLater} from '../../../common/validators/is-today-or-later.validator';
import {IsAfter} from '../../../common/validators/is-after.validator';

/**
 * Create tenant subscription DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant subscription information.
 */
export class CreateTenantSubscriptionDto {
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
   * Subscription plan.
   *
   * - Required field.
   * - Must be one of 'free', 'basic', or 'premium'.
   *
   * @type {'free' | 'basic' | 'premium'}
   */
  @IsEnum(['free', 'basic', 'premium'])
  @IsNotEmpty()
  plan!: 'free' | 'basic' | 'premium';

  /**
   * Subscription start date.
   *
   * - Required field.
   * - Must be a valid date.
   *
   * @type {string}
   */
  @IsDateString()
  @IsNotEmpty()
  @IsTodayOrLater({ message: 'startDate must be today or later' })
  startDate!: string;

  /**
   * Subscription end date.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {string | null}
   */
  @IsOptional()
  @IsDateString()
  @IsTodayOrLater({ message: 'endDate must be today or later' })
  @IsAfter('startDate', { message: 'endDate must come after startDate' })
  endDate!: string | null;

  /**
   * Is active.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
  isActive!: boolean;
}
