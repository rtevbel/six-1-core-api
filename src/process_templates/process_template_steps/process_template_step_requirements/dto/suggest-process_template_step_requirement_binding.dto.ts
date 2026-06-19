import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SuggestProcessTemplateStepRequirementBindingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processTemplateStepRequirementId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processTemplateStepId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tenantId?: number;
}
