import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDescriptionDto } from './create-role-description.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update role description DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a role description.
 */
export class UpdateRoleDescriptionDto extends PartialType(
  CreateRoleDescriptionDto,
) {
  /**
   * The ID of the role description.
   *
   * - Optional field.
   * - Must be a number.
   * - Default value is 0.
   *
   * @type {number}
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleDescriptionId?: number;

  /**
   * The ID of the role.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleId?: number;
}
