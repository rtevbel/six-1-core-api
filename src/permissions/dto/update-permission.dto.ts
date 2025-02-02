import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';
import { UpdatePermissionDescriptionDto } from '../dto/update-permission-description.dto';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object (DTO) for updating a permission.
 * 
 * @version 1.0.0
 * 
 * This DTO extends `CreatePermissionDto` but omits the `descriptions` property.
 * It allows partial updates to permission attributes while including updated descriptions.
 */
export class UpdatePermissionDto extends PartialType(
  OmitType(CreatePermissionDto, ['descriptions'] as const),
) {

  /**
   * Unique identifier for the permission.
   * 
   * - Required field.
   * - Must be a number.
   * 
   * @example 10
   * 
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_id: number = 0;

  /**
   * List of permission descriptions to update.
   * 
   * - Required field.
   * - Must be an array of `UpdatePermissionDescriptionDto` objects.
   * - Validates each description.
   * 
   * @example [{ permission_description_id: 101, permission_id: 10, name: "View Orders" }]
   * 
   * @type {UpdatePermissionDescriptionDto[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionDescriptionDto)
  descriptions: UpdatePermissionDescriptionDto[] = [];
}
