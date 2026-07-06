import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateResourceMetaDto {
  @IsNumber()
  @IsNotEmpty()
  resourceId!: number;

  @IsObject()
  @IsNotEmpty()
  metaJson!: Record<string, unknown>;
}
