import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDescriptionDto } from './create-permission-description.dto';
import { IsNumber, IsOptional } from 'class-validator';

/**
 * Data Transfer Object (DTO) for updating a permission description.
 * 
 * @version 1.0.0
 * 
 * This DTO extends the `CreatePermissionDescriptionDto` and 
 * allows partial updates to permission descriptions in multiple languages.
 */
export class UpdatePermissionDescriptionDto extends PartialType(
  CreatePermissionDescriptionDto,
) {

  /**
   * Unique id for the permission description.
   * 
   * - Optional field.
   * - Must be a number.
   * 
   * @example 101
   * 
   * @type {number | undefined}
   */
  @IsOptional()
  @IsNumber()
  permission_description_id?: number;

  /**
   * Unique id for the associated permission.
   * 
   * - Optional field.
   * - Must be a number.
   * 
   * @example 5
   * 
   * @type {number | undefined}
   */
  @IsOptional()
  @IsNumber()
  permission_id?: number;
}
