import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateUserLoginTokenDto } from './create-user-login-token.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

/**
 * Update user login token dto class.
 *
 * Version:1.0.0.
 *
 * This class extends CreateUserLoginTokenDto to inherit the,
 * properities with optional tags and validates user login token,
 * update request.
 *
 */
export class UpdateUserLoginTokenDto extends PartialType(
  CreateUserLoginTokenDto,
) {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  token_id!: number;
}
