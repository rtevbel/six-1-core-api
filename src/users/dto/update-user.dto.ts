import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { UpdateUserRoleDto } from './update-user-role.dto';
import { Type } from 'class-transformer';

/**
 * Update user dto class.
 *
 * Version:1.0.0.
 *
 * This update user data transfer object class is used,
 * to validate the user's update request before passing,
 * to service.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['user_roles'] as const),
) {
  @IsNotEmpty()
  @IsNumber()
  user_id!: number;

  @IsOptional()
  @IsArray()
  @Type(() => UpdateUserRoleDto)
  @ValidateNested({ each: true })
  user_roles?: UpdateUserRoleDto[];
}
