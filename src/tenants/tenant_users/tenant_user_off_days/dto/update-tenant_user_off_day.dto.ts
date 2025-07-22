import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsString,
} from 'class-validator';
import { CreateTenantUserOffDayDto } from './create-tenant_user_off_day.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update tenant user off day DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user off days.
 */
export class UpdateTenantUserOffDayDto extends PartialType(
  CreateTenantUserOffDayDto,
) {
  /**
   * Tenant user off day ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserOffDayId!: number;

  /**
   * Updated by user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  updatedBy!: number;
}
