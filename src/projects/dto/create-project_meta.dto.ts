import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateProjectMetaDto {
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  @IsObject()
  @IsNotEmpty()
  metaJson!: Record<string, unknown>;
}
