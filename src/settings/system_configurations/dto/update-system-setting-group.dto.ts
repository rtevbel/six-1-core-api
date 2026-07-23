import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSystemSettingGroupDto } from './create-system-setting-group.dto';

export class UpdateSystemSettingGroupDto extends PartialType(
  CreateSystemSettingGroupDto,
) {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  groupId!: number;
}
