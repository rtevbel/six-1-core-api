import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantWorkingHoursDto } from './create-tenant_working_hour.dto';

/**
 * Update Tenant Working Hours DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant working hours.
 */
export class UpdateTenantWorkingHoursDto extends PartialType(
  CreateTenantWorkingHoursDto,
) {
  /**
   * Tenant Working Hour ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantWorkingHourId!: number;
}
