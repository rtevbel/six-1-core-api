import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantUserMetaDto } from './create-tenant_user_meta.dto';
import {PartialType} from "@nestjs/mapped-types";

/**
 * Update tenant user metadata DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user metadata.
 */
export class UpdateTenantUserMetaDto extends PartialType(CreateTenantUserMetaDto){
  /**
   * Tenant user metadata ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserMetaId!: number;

}
