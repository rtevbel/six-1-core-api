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
  user_id?: number;

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
   * - Must be a string with a maximum length of 100 characters.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  username!: string;

  /**
   * First name of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 100 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  first_name?: string;

  /**
   * Last name of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 100 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(100)
  last_name?: string;

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
   * - Must be a string with a maximum length of 250 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(250)
  display_name?: string;

  /**
   * Dashboard URL of the user.
   *
   * - Optional field.
   * - Must be a string with a maximum length of 100 characters.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dashboard_url?: string;

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
  activation_key?: string;

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
  last_login_at?: string;

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
  created_at?: string;

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
  updated_at?: string;
}
