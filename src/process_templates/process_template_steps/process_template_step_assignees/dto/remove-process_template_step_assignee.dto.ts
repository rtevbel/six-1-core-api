import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RemoveProcessTemplateStepAssigneeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepAssigneeId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tenantId?: number;
}
