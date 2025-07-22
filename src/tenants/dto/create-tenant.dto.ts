import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Create tenant DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a tenant.
 */
export class CreateTenantDto {
  /**
   * Name of the tenant (e.g., Company, Freelancer, Middleman).
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
   * Tenant type ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantTypeId!: number;

  /**
   * Unique identifier for the tenant.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  tenantIdentifier!: string;

  /**
   * User ID associated with the tenant.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  userId!: number;

  /**
   * Status ID of the tenant.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  statusId!: number;
}
