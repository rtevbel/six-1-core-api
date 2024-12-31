import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDescriptionDto } from './create-permission-description.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdatePermissionDescriptionDto extends PartialType(
  CreatePermissionDescriptionDto,
) {
  @IsOptional()
  @IsNumber()
  permission_description_id?: number;

  @IsOptional()
  @IsNumber()
  permission_id?: number;
}
