import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEmail,
  IsArray,
  IsOptional,
  ValidateNested,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { CreateUserRoleDto } from './create-user-role.dto';
import { Type } from 'class-transformer';

/**
 * Create user dto class.
 *
 * Version:1.0.0.
 *
 * This data transfer object is used to,
 * validate the create user request data.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  last_name: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  interface_locale?: string = 'en_GB';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean = false;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean = false;

  @IsOptional()
  @IsDateString()
  block_date?: string;

  extra: string;

  @IsOptional()
  @IsArray()
  @Type(() => CreateUserRoleDto)
  @ValidateNested({ each: true })
  user_roles?: CreateUserRoleDto[];
}
