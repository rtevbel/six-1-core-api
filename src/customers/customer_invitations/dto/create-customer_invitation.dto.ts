import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerInvitationDto {
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  @IsOptional()
  @IsNumber()
  taskId?: number;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsNumber()
  @IsNotEmpty()
  customerRoleId!: number;

  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined'])
  status?: 'pending' | 'accepted' | 'declined';

  @IsNumber()
  @IsNotEmpty()
  invitedBy!: number;

  @IsOptional()
  @IsString()
  invitedAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
