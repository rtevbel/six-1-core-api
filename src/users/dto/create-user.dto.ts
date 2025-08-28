import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEmail,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data transfer object for the Users table.
 */
export class CreateUserDto {
  /**
   * User ID.
   *
   * - Optional field (auto-generated).
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  userId?: number;

  /**
   * Email address of the user.
   *
   * - Required field.
   * - Must be a valid email address.
   * - Maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  @MaxLength(255)
  email!: string;

  /**
   * Username of the user.
   *
   * - Required field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  username!: string;

  /**
   * First name of the user.
   *
   * - Required field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  firstName!: string;

  /**
   * Last name of the user.
   *
   * - Required field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  lastName!: string;

  /**
   * Password of the user.
   *
   * - Required field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  password!: string;

  /**
   * Display name of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  /**
   * Dashboard URL of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dashboardUrl?: string;

  /**
   * Activation key of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 255 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  activationKey?: string;

  /**
   * Status of the user.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  status!: number;

  /**
   * Last login date of the user.
   *
   * - Optional field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsDateString()
  lastLoginAt?: string;

  /**
   * Creation date of the user.
   *
   * - Optional field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  /**
   * Update date of the user.
   *
   * - Optional field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}
