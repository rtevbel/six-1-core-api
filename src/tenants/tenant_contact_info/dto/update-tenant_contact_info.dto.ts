import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantContactInfoDto } from './create-tenant_contact_info.dto';

/**
 * Update tenant contact info DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant contact information.
 */
export class UpdateTenantContactInfoDto extends PartialType(
  CreateTenantContactInfoDto,
) {
  /**
   * Tenant contact info ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantContactId!: number;

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
