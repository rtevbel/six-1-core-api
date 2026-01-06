import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO for updating customer records.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsNumber()
  @IsNotEmpty()
  customerId!: number;
}
