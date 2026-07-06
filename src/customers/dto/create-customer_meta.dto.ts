import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateCustomerMetaDto {
  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

  @IsObject()
  @IsNotEmpty()
  metaJson!: Record<string, unknown>;
}
