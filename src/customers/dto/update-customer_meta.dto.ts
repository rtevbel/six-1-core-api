import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerMetaDto } from './create-customer_meta.dto';

export class UpdateCustomerMetaDto extends PartialType(CreateCustomerMetaDto) {}
