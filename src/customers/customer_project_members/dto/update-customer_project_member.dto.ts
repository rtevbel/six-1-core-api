import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCustomerProjectMemberDto } from './create-customer_project_member.dto';

export class UpdateCustomerProjectMemberDto extends PartialType(
  CreateCustomerProjectMemberDto,
) {
  @IsNumber()
  @IsNotEmpty()
  customerProjectMemberId!: number;
}
