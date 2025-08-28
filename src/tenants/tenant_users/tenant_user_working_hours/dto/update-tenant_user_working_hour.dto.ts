import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { CreateTenantUserWorkingHoursDto } from './create-tenant_user_working_hour.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update tenant user working hours DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user working hours.
 */
export class UpdateTenantUserWorkingHoursDto extends PartialType(
  CreateTenantUserWorkingHoursDto,
) {
  /**
   * Tenant user working hour ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserWorkingHourId!: number;

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
