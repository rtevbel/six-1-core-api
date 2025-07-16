import {
  IsNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create user meta DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating user metadata.
 */
export class CreateUserMetaDto {
  /**
   * The ID of the user.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_id!: number;

  /**
   * The metadata key.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  meta_key!: string;

  /**
   * The metadata value.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  meta_value!: string;

  /**
   * Optional list of metadata keys for batch creation.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  meta_keys?: string[];

  /**
   * Optional list of metadata values for batch creation.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  meta_values?: string[];
}
