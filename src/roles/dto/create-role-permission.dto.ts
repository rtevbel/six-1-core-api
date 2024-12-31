import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_id: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  role_id: number;
}
