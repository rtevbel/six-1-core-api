import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create tenant contact info DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant contact information.
 */
export class CreateTenantContactInfoDto {
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
   * Email address.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  email!: string;

  /**
   * Phone number.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  phone!: string;

  /**
   * Physical address.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  address!: string;

  /**
   * City.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  city!: string;

  /**
   * State.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  state!: string;

  /**
   * Country.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  country!: string;

  /**
   * Postal code.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  postalCode!: string;

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
