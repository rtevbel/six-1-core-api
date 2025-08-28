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
 * @version 0.0.1
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
  userMetaId!: number;

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
  metaKeys?: string[];

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
  metaValues?: string[];
}
