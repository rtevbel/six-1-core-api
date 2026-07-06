import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerContactInfoMetaDto } from './create-customer_contact_info_meta.dto';

export class UpdateCustomerContactInfoMetaDto extends PartialType(
  CreateCustomerContactInfoMetaDto,
) {}
