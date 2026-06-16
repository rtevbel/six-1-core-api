import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateProcessTemplateStepAssigneeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processTemplateStepId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  assignmentOrder?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  createdBy!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tenantId?: number;
}
