import {
  IsInt,
  IsOptional,
  IsPositive,
  IsDate,
  IsArray,
  ValidateNested,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePermissionDescriptionDto } from './create-permission_description.dto';

/**
 * Create permission DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a permission.
 */
export class CreatePermissionDto {
  /**
   * The ID of the permission.
   *
   * - Optional field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsInt()
  @IsPositive()
  permissionId?: number;

  /**
   * The status ID of the permission.
   *
   * - Required field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsPositive()
  statusId!: number;

  /**
   * The ID of the user who created the permission.
   *
   * - Required field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  createdBy!: number;

  /**
   * The ID of the user who last updated the permission.
   *
   * - Optional field.
   * - Must be a positive integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;

  /**
   * The creation timestamp of the permission.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  /**
   * The update timestamp of the permission.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsOptional()
  @IsDate()
  updatedAt?: Date;

  /**
   * List of permission descriptions.
   *
   * - Required field.
   * - Must be an array of `CreatePermissionDescriptionDto`.
   *
   * @type {CreatePermissionDescriptionDto[]}
   */
  @IsArray()
  @Type(() => CreatePermissionDescriptionDto)
  @ValidateNested({ each: true })
  descriptions!: CreatePermissionDescriptionDto[];
}
