import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTypeDto } from './create-tenant_type.dto';

/**
 * Update tenant type DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a tenant type.
 */
export class UpdateTenantTypeDto extends PartialType(CreateTenantTypeDto) {
  /**
   * The ID of the tenant type.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  tenantTypeId!: number;
}
