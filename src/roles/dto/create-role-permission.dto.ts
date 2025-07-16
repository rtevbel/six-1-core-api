import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * Create role permission DTO class.
 *
 * @version 1.0.0
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
  @IsNotEmpty()
  @IsNumber()
  role_id!: number;

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
  permission_id!: number;
}
