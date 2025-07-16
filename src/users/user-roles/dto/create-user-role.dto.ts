import { IsNotEmpty, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create user role DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a user role.
 */
export class CreateUserRoleDto {
  /**
   * The ID of the user.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_id!: number;

  /**
   * The ID of the role.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  role_id!: number;

  /**
   * The ID of the user who created this mapping.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  created_by!: number;

  /**
   * List of user IDs for batch creation.
   *
   * - Optional field.
   * - Must be an array of numbers.
   *
   * @type {number[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Number)
  user_ids?: number[];

  /**
   * List of role IDs for batch creation.
   *
   * - Optional field.
   * - Must be an array of numbers.
   *
   * @type {number[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Number)
  role_ids?: number[];
}
