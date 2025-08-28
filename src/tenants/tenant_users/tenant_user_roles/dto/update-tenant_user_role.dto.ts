import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { CreateTenantUserRoleDto } from './create-tenant_user_role.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update tenant user role DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user roles.
 */
export class UpdateTenantUserRoleDto extends PartialType(
  CreateTenantUserRoleDto,
) {
  /**
   * Tenant user role ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserRoleId!: number;
}
