import {
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsDate,
} from 'class-validator';

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
   * @type {Date}
   */
  @IsDate()
  @IsNotEmpty()
  startDate!: Date;

  /**
   * Subscription end date.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date | null}
   */
  @IsDate()
  @IsOptional()
  endDate!: Date | null;

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
