import { PartialType } from '@nestjs/mapped-types';
import { CreateRolePermissionDto } from './create-role-permission.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRolePermissionDto extends PartialType(
  CreateRolePermissionDto,
) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_permission_id?: number;
}
