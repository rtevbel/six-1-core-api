import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePermissionDescriptionDto } from './create-permission-description.dto';

export class CreatePermissionDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_deleted?: boolean = false;

  @IsArray()
  @Type(() => CreatePermissionDescriptionDto)
  @ValidateNested({ each: true })
  descriptions: CreatePermissionDescriptionDto[];
}
