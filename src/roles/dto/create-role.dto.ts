import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRoleDescriptionDto } from './create-role-description.dto';
import { CreateRolePermissionDto } from './create-role-permission.dto';

/**
 * Create role DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a role.
 */
export class CreateRoleDto {
  /**
   * The status ID of the role.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  status_id?: number;

  /**
   * The tenant ID linked to the role.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  tenant_id?: number;

  /**
   * Indicates if the role is a tenant role.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  is_tenant_role?: boolean;

  /**
   * Indicates if the role is a tenant team role.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  is_tenant_team_role?: boolean;

  /**
   * Indicates if the role is a customer role.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  is_customer_role?: boolean;

  /**
   * List of role descriptions.
   *
   * - Required field.
   * - Must be an array of `CreateRoleDescriptionDto`.
   *
   * @type {CreateRoleDescriptionDto[]}
   */
  @IsArray()
  @Type(() => CreateRoleDescriptionDto)
  @ValidateNested({ each: true })
  descriptions!: CreateRoleDescriptionDto[];

  /**
   * List of role permissions.
   *
   * - Required field.
   * - Must be an array of `CreateRolePermissionDto`.
   *
   * @type {CreateRolePermissionDto[]}
   */
  @IsArray()
  @Type(() => CreateRolePermissionDto)
  @ValidateNested({ each: true })
  permissions!: CreateRolePermissionDto[];
}
