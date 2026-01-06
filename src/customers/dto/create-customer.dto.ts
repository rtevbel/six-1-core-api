import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for creating a customer record.
 */
export class CreateCustomerDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  firstName?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  lastName?: string;

  @IsBoolean()
  @IsOptional()
  isProfileCompleted?: boolean;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
