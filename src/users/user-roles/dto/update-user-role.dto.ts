import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserRoleDto } from './create-user-role.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update user role DTO class.
 *
 * @version 1.0.0
 *
 * Data transfer object for updating a user role.
 */
export class UpdateUserRoleDto extends PartialType(
  OmitType(CreateUserRoleDto, ['created_by'] as const),
) {
  /**
   * The ID of the user role.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_role_id!: number;

  /**
   * List of updated user IDs.
   *
   * - Optional field.
   * - Must be an array of numbers.
   *
   * @type {number[]}
   */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ValidateNested({ each: true })
  user_ids?: number[];

  /**
   * List of updated role IDs.
   *
   * - Optional field.
   * - Must be an array of numbers.
   *
   * @type {number[]}
   */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ValidateNested({ each: true })
  role_ids?: number[];
}
