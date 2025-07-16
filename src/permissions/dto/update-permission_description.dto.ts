import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDescriptionDto } from './create-permission_description.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update permission description DTO class.
 *
 * @version 1.0.0
 *
 * Data transfer object for updating a permission description.
 */
export class UpdatePermissionDescriptionDto extends PartialType(
  OmitType(CreatePermissionDescriptionDto, ['permission_id'] as const),
) {
  /**
   * The ID of the permission description.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_description_id!: number;
}
