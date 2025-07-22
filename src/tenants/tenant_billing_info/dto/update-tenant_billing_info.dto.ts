import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantBillingInfoDto } from './create-tenant_billing_info.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update tenant billing info DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant billing information.
 */

export class UpdateTenantBillingInfoDto extends PartialType(
  CreateTenantBillingInfoDto,
) {
  /**
   * Tenant billing info ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantBillingId!: number;

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
