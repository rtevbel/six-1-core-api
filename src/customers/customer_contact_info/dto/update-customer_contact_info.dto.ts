import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCustomerContactInfoDto } from './create-customer_contact_info.dto';

export class UpdateCustomerContactInfoDto extends PartialType(
  CreateCustomerContactInfoDto,
) {
  @IsNumber()
  @IsNotEmpty()
  customerContactId!: number;

  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

  @IsNumber()
  @IsNotEmpty()
  updatedBy!: number;
}
