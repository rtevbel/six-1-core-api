import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantUserDto } from './create-tenant_user.dto';
import { IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Update tenant user DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant users.
 */
export class UpdateTenantUserDto extends PartialType(CreateTenantUserDto) {
  /**
   * Tenant user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserId!: number;

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
