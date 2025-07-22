import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * Update tenant DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a tenant.
 */
export class UpdateTenantDto extends PartialType(CreateTenantDto) {
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
}
