import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';
import { UpdatePermissionDescriptionDto } from '../dto/update-permission-description.dto';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePermissionDto extends PartialType(
  OmitType(CreatePermissionDto, ['descriptions'] as const),
) {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  permission_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionDescriptionDto)
  descriptions: UpdatePermissionDescriptionDto[];
}
