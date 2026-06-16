import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Remove a template step action. Omit `tenantId` for super-admin (global) scope.
 */
export class RemoveProcessTemplateStepActionDto {
  @Type(() => Number)
  @IsNumber()
  stepActionId!: number;

  @Type(() => Number)
  @IsNumber()
  processTemplateStepId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenantId?: number;
}
