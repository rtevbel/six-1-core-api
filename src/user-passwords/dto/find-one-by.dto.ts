import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
/**
 * Fine one by dto class.
 *
 * Version:1.0.0.
 */
export class FindOneByDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsString()
  password_hash?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;
}
