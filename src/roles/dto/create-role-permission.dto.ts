import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_id?: number;
}
