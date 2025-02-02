import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePermissionDescriptionDto } from './create-permission-description.dto';

/**
 * Data Transfer Object (DTO) for creating a permission.
 * 
 * @version 1.0.0
 * 
 * This DTO defines the structure and validation rules for creating a new permission,
 * including its activation status, deletion status, and associated descriptions.
 */
export class CreatePermissionDto {
  
  /**
   * Indicates whether the permission is active.
   * 
   * - Optional field.
   * - Automatically transformed to a boolean value.
   * 
   * @example true
   * 
   * @type {boolean | undefined}
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  /**
   * Indicates whether the permission is marked as deleted.
   * 
   * - Optional field.
   * - Defaults to `false`.
   * - Automatically transformed to a boolean value.
   * 
   * @example false
   * 
   * @type {boolean}
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_deleted?: boolean = false;

  /**
   * Array of descriptions for the permission in various languages.
   * 
   * - Must be an array.
   * - Each item must be a valid `CreatePermissionDescriptionDto` object.
   * - Ensures nested validation for each item.
   * 
   * @example [
   *   { language_id: 1, name: "Edit User", description: "Allows editing of user profiles." },
   *   { language_id: 2, name: "Benutzer bearbeiten", description: "Ermöglicht das Bearbeiten von Benutzerprofilen." }
   * ]
   * 
   * @type {CreatePermissionDescriptionDto[]}
   */
  @IsArray()
  @Type(() => CreatePermissionDescriptionDto)
  @ValidateNested({ each: true })
  descriptions!: CreatePermissionDescriptionDto[];
}
