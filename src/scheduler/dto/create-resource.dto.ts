import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';

/**
 * Create Resource DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a resource.
 */
export class CreateResourceDto {
  /**
   * Name of the resource.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Description of the resource.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Tenant user ID (if resource is human).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  tenantUserId?: number;

  /**
   * Type of resource.
   *
   * - Required field.
   * - Must be 'equipment' or 'human'.
   *
   * @type {string}
   */
  @IsEnum(['equipment', 'human'])
  @IsNotEmpty()
  type!: 'equipment' | 'human';

  /**
   * Tenant ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  /**
   * Is the resource shared across tenants?
   *
   * - Optional field.
   * - Must be a number (0 or 1).
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  isShared?: number;
}
