import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import {Transform} from "class-transformer";

/**
 * Create password dto class.
 *
 * Version:1.0.0.
 *
 * Data transfer object is used to validate,
 * create password request.
 */
export class CreatePasswordDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_id!: number;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  password_hash!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(15)
  ip_address!: string;
}
