import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * Create tenant user metadata DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user metadata.
 */
export class CreateTenantUserMetaDto {
  /**
   * Tenant user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserId!: number;

  /**
   * Metadata key.
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length: 255.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  metaKey!: string;

  /**
   * Metadata value.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  metaValue?: string;

  /**
   * Created by user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;
}
