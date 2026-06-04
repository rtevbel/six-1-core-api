import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Remove a process template. Omit `tenantId` for super-admin (global) scope.
 */
export class RemoveProcessTemplateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;
}
