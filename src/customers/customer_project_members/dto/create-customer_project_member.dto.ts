import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerProjectMemberDto {
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

  @IsNumber()
  @IsNotEmpty()
  roleId!: number;

  @IsOptional()
  @IsString()
  joinedAt?: string;
}
