import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserEntity } from '../entities/user.entity';
import { Type } from 'class-transformer';

/**
 * Create user role dto class.
 *
 * Version:1.0.0.
 *
 * This data transfer object is used to,
 * validate the user's roles data coming,
 * in request.
 */
export class CreateUserRoleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id: number = 0;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  role_id!: number;
}
