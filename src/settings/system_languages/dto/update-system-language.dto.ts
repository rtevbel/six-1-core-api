import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemLanguageDto } from './create-system-language.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update system language DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a system language.
 */
export class UpdateSystemLanguageDto extends PartialType(
  CreateSystemLanguageDto,
) {
  /**
   * The ID of the language.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  languageId!: number;
}
