import { PartialType } from '@nestjs/mapped-types';
import { CreateUserMetaDto } from './create-user-meta.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update user meta DTO class.
 *
 * @version 1.0.0
 *
 * Data transfer object for updating user metadata.
 */
export class UpdateUserMetaDto extends PartialType(CreateUserMetaDto) {
  /**
   * The ID of the user meta entry.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_meta_id!: number;

  /**
   * Optional list of updated metadata keys.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  meta_keys?: string[];

  /**
   * Optional list of updated metadata values.
   *
   * - Must be an array of strings.
   *
   * @type {string[]}
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  meta_values?: string[];
}
