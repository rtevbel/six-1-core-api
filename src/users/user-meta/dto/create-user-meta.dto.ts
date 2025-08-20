import {
  IsNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
  IsOptional,
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
  userId!: number;

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
  metaKey!: string;

  /**
   * The metadata value.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  metaValue?: string;

  /**
   * Optional list of metadata keys for batch creation.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  metaKeys?: string[];

  /**
   * Optional list of metadata values for batch creation.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  metaValues?: string[];
}