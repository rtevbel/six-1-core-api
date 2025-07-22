import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create tenant meta DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant metadata.
 */
export class CreateTenantMetaDto {
  /**
   * Tenant ID associated with the metadata.
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
   * Key for the metadata.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  metaKey!: string;

  /**
   * Value for the metadata.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  metaValue!: string;
}
