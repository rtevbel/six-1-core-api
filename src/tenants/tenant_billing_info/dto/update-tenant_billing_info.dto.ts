import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantBillingInfoDto } from './create-tenant_billing_info.dto';

/**
 * Update tenant billing info DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant billing info.
 */
export class UpdateTenantBillingInfoDto extends PartialType(
  CreateTenantBillingInfoDto,
) {
  /**
   * Unique identifier for the tenant billing info.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantBillingId!: number;
}
