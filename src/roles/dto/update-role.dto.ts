import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDescriptionDto } from './update-role-description.dto';
import { UpdateRolePermissionDto } from './update-role-permission.dto';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['descriptions', 'permissions'] as const),
) {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  role_id: number;

  @IsArray()
  @Type(() => UpdateRoleDescriptionDto)
  @ValidateNested({ each: true })
  descriptions: UpdateRoleDescriptionDto[];

  @IsOptional()
  @IsArray()
  @Type(() => UpdateRolePermissionDto)
  @ValidateNested({ each: true })
  permissions?: UpdateRolePermissionDto[];
}
