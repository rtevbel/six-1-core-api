import { PartialType } from '@nestjs/mapped-types';
import { CreateRolePermissionDto } from './create-role-permission.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update role permission DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a role permission.
 */
export class UpdateRolePermissionDto extends PartialType(
  CreateRolePermissionDto,
) {
  /**
   * The ID of the role permission.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_permission_id?: number;
}
