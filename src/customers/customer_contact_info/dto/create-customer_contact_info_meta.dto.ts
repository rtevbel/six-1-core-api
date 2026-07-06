import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateCustomerContactInfoMetaDto {
  @IsNumber()
  @IsNotEmpty()
  customerContactId!: number;

  @IsObject()
  @IsNotEmpty()
  metaJson!: Record<string, unknown>;
}
