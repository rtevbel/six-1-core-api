import { IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantOffDaysDto } from './create-tenant_off_day.dto';

/**
 * Update tenant off days DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant off days.
 */
export class UpdateTenantOffDaysDto extends PartialType(
  CreateTenantOffDaysDto,
) {
  /**
   * Unique identifier for the tenant off day.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantOffDayId!: number;

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
  updatedBy?: number;
}
