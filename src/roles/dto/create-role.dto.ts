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
  statusId?: number;

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
  tenantId?: number;

  /**
   * Indicates if the role is a tenant role.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  isTenantRole?: number;

  /**
   * Indicates if the role is a tenant team role.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  isTenantTeamRole?: number;

  /**
   * Indicates if the role is a customer role.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  isCustomerRole?: number;

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
