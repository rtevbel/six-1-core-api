import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerTaskMemberDto {
  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

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
