import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Update user DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a user.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['createdAt', 'updatedAt'] as const),
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
  userId!: number;

  /**
   * Email address of the user.
   *
   * - Optional field.
   * - Must be a valid email address.
   * - Maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.toLowerCase())
  @MaxLength(255)
  email?: string;

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
  lastLoginAt?: string;

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
  updatedAt?: string;
}
