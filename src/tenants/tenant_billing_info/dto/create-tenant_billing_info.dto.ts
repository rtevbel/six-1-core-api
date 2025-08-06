import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create tenant billing info DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant billing info.
 */
export class CreateTenantBillingInfoDto {
  /**
   * Tenant ID associated with the billing info.
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
   * Billing email address.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  billingEmail!: string;

  /**
   * Billing phone number.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingPhone!: string;

  /**
   * Billing physical address.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingAddress!: string;

  /**
   * Billing city.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingCity!: string;

  /**
   * Billing state.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingState!: string;

  /**
   * Billing country.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingCountry!: string;

  /**
   * Billing postal code.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingPostalCode!: string;

  /**
   * Billing currency (e.g., USD, EUR).
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  billingCurrency!: string;

  /**
   * ID of the user who created the billing info.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  /**
   * ID of the user who last updated the billing info.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  updatedBy!: number;
}
