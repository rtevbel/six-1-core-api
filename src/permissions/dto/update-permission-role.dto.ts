import { PartialType } from '@nestjs/mapped-types';
import { CreateRolePermissionDto } from '../../roles/dto/create-role-permission.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Junction row for permission ↔ role membership writes.
 */
export class UpdatePermissionRoleDto extends PartialType(CreateRolePermissionDto) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rolePermissionId?: number;
}
