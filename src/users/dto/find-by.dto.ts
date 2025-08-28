import {
  IsString,
  MaxLength,
  IsEmail,
  IsOptional,
  IsNumber,
} from 'class-validator';

/**
 * Data Transfer Object (DTO) for filtering and pagination.
 *
 * @version 1.0.0
 *
 * Data transfer object for filtering users.
 */
export class FindByDTO {
  /**
   * First name of the user for filtering results.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 40 characters.
   *
   * @example "Jhon"
   *
   * @type {string | undefined}
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  firstName?: string;

  /**
   * Last name of the user for filtering results.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 40 characters.
   *
   * @type {string | undefined}
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastName?: string;

  /**
   * Email of the user for filtering results.
   *
   * - Optional field.
   * - Must be a valid email address.
   * - Must be a string with a maximum length of 150 characters.
   *
   * @type {string | undefined}
   */
  @IsOptional()
  @IsString()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  /**
   * Username of the user for filtering results.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 40 characters.
   *
   * @type {string | undefined}
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  username?: string;

  /**
   * Flag indicating whether the user is active.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number | undefined}
   */
  @IsOptional()
  @IsNumber()
  status?: number;
}
