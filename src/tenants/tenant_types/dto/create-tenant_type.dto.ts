import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create tenant type DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a tenant type.
 */
export class CreateTenantTypeDto {
  /**
   * Human-readable tenant name like company, freelancer.
   *
   * - Required field.
   * - Must be a string.
   * - Must be unique.
   *
   * @type {string}
   */
  @IsString()
  name!: string;

  /**
   * Description of the tenant type.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Tenant status ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @Type(() => Number)
  @IsNumber()
  statusId!: number;
}
