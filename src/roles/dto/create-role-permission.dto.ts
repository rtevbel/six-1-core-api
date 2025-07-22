import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * Create role permission DTO class.
 *
 * @version 1.0.1
 *
 * Data transfer object for creating a role permission.
 */
export class CreateRolePermissionDto {
  /**
   * The ID of the role.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  roleId!: number;

  /**
   * The ID of the permission.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  permissionId!: number;
}
