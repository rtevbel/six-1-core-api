import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePasswordDto } from './create-password.dto';

/**
 * Update password dto class.
 *
 * Version:1.0.0.
 *
 * Data transfer object is used to validate,
 * update password request.
 */
export class UpdatePasswordDto extends PartialType(CreatePasswordDto) {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  password_id: number;
}
