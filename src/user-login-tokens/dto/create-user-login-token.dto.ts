import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {Transform} from "class-transformer";

/**
 *Create user login token dto class.
 *
 * Version:1.0.0.
 *
 * This dto class is being used to validate,
 * the user's login details before save.
 */
export class CreateUserLoginTokenDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  user_id!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(65535)
  token!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(15)
  ip_address!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  user_agent!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(255)
  device_name!: string;
}
