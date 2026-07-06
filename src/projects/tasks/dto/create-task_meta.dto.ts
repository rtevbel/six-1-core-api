import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateTaskMetaDto {
  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

  @IsObject()
  @IsNotEmpty()
  metaJson!: Record<string, unknown>;
}
