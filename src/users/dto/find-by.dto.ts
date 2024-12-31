import {
  IsString,
  MaxLength,
  IsEmail,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class FindByDTO {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  last_name?: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  username?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean;
}
