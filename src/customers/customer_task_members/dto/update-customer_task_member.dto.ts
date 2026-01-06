import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCustomerTaskMemberDto } from './create-customer_task_member.dto';

export class UpdateCustomerTaskMemberDto extends PartialType(
  CreateCustomerTaskMemberDto,
) {
  @IsNumber()
  @IsNotEmpty()
  customerTaskMemberId!: number;
}
