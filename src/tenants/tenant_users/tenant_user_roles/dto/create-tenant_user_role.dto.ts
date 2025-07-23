import { IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create tenant user role DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user roles.
 */
export class CreateTenantUserRoleDto {
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
   * Role ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  roleId!: number;

  /**
   * Created by user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;
}
