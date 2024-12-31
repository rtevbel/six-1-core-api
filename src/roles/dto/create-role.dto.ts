import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateRoleDescriptionDto } from './create-role-description.dto';
import { CreateRolePermissionDto } from './create-role-permission.dto';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = false;

  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean = false;

  @IsArray()
  @Type(() => CreateRoleDescriptionDto)
  @ValidateNested({ each: true })
  descriptions: CreateRoleDescriptionDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CreateRolePermissionDto)
  @ValidateNested({ each: true })
  permissions?: CreateRolePermissionDto[];
}
