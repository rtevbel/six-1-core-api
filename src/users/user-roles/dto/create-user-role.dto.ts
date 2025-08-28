import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Create UserRole DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a user-role mapping.
 */
export class CreateUserRoleDto {
  /**
   * User ID associated with the role.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  userId!: number;

  /**
   * Role ID associated with the user.
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
   * User ID of the creator.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  createdBy!: number;
}
