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
  IsNumber,
} from 'class-validator';
import { CreateUserRoleDto } from './create-user-role.dto';
import { Type } from 'class-transformer';
import {AppLanguagesEnum} from "../../common/enums/app-languages.enum";
import {Transform} from "class-transformer";
import sanitizeHtml from "sanitize-html";

/**
 * Create user dto class.
 *
 * Version:1.0.0.
 *
 * This data transfer object is used to,
 * validate the create user request data.
 */
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(40)
  first_name!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(40)
  last_name!: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  @MaxLength(150)
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(40)
  username!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  password!: string;

  @IsOptional()
  @IsNumber()
  interface_locale?: number = AppLanguagesEnum.English;

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

  @Transform(({ value }) => sanitizeHtml(value)) // Removes harmful HTML tags
  extra: string = '';
  
  @IsOptional()
  @IsArray()
  @Type(() => CreateUserRoleDto)
  @ValidateNested({ each: true })
  user_roles?: CreateUserRoleDto[];
}
