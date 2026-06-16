import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FiltersDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processTemplateStepId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tenantId?: number;
}
