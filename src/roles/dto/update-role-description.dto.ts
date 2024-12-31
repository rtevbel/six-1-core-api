import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDescriptionDto } from './create-role-description.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoleDescriptionDto extends PartialType(
  CreateRoleDescriptionDto,
) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_description_id?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role_id?: number = 0;
}
