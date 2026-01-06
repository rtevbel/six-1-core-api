import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCustomerInvitationDto } from './create-customer_invitation.dto';

export class UpdateCustomerInvitationDto extends PartialType(
  CreateCustomerInvitationDto,
) {
  @IsNumber()
  @IsNotEmpty()
  invitationId!: number;
}
