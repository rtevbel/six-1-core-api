import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update user DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a user.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['created_at', 'updated_at'] as const),
) {
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
   * Last login date of the user.
   *
   * - Optional field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsDateString()
  last_login_at?: string;

  /**
   * Update date of the user.
   *
   * - Optional field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsDateString()
  updated_at?: string;
}
