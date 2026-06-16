import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class ValidateProcessTemplateContextDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

  @IsObject()
  context!: Record<string, unknown>;
}
