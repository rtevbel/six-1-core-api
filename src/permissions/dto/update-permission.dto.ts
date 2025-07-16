import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';
import { UpdatePermissionDescriptionDto } from './update-permission_description.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
/**
 * Update permission DTO class.
 *
 * @version 1.0.0
 *
 * Data transfer object for updating a permission.
 */
export class UpdatePermissionDto extends PartialType(
  OmitType(CreatePermissionDto, ['descriptions'] as const),
) {
  /**
   * The ID of the permission.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_id!: number;

  /**
   * List of updated permission descriptions.
   *
   * - Required field.
   * - Must be an array of `UpdatePermissionDescriptionDto`.
   *
   * @type {UpdatePermissionDescriptionDto[]}
   */
  @IsArray()
  @Type(() => UpdatePermissionDescriptionDto)
  @ValidateNested({ each: true })
  descriptions: UpdatePermissionDescriptionDto[] = [];
}
