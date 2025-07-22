import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDescriptionDto } from './update-role-description.dto';
import { UpdateRolePermissionDto } from './update-role-permission.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update role DTO class.
 *
 * @version 1.0.0
 *
 * Data transfer object for updating a role.
 */
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['descriptions', 'permissions'] as const),
) {
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
  roleId!: number;

  /**
   * List of updated role descriptions.
   *
   * - Required field.
   * - Must be an array of `UpdateRoleDescriptionDto`.
   *
   * @type {UpdateRoleDescriptionDto[]}
   */
  @IsArray()
  @Type(() => UpdateRoleDescriptionDto)
  @ValidateNested({ each: true })
  descriptions: UpdateRoleDescriptionDto[] = [];

  /**
   * List of updated role permissions.
   *
   * - Optional field.
   * - Must be an array of `UpdateRolePermissionDto`.
   *
   * @type {UpdateRolePermissionDto[]}
   */
  @IsOptional()
  @IsArray()
  @Type(() => UpdateRolePermissionDto)
  @ValidateNested({ each: true })
  permissions?: UpdateRolePermissionDto[];
}
