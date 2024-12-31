import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRoleDto } from './create-user-role.dto';

/**
 * Update user role dto class.
 *
 * Version:1.0.0.
 *
 * This data transfer object is used to,
 * validate the user's roles data coming,
 * in request.
 */
export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {
  @IsNotEmpty()
  @IsNumber()
  user_role_id: number;
}
