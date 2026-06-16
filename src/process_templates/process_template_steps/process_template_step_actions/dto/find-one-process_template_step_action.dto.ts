import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Find one template step action. Omit `tenantId` for super-admin (global) scope.
 */
export class FindOneProcessTemplateStepActionDto {
  @Type(() => Number)
  @IsNumber()
  stepActionId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenantId?: number;
}
