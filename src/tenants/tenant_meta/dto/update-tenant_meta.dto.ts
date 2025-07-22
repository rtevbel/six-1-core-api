import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantMetaDto } from './create-tenant_meta.dto';

/**
 * Update tenant meta DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant metadata.
 */
export class UpdateTenantMetaDto extends PartialType(CreateTenantMetaDto) {
  /**
   * Tenant meta ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantMetaId!: number;
}
