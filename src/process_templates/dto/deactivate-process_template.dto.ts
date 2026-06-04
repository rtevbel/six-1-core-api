import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * DTO for deactivating (archiving) a process template.
 * Omit `tenantId` for super-admin (global) scope; provide it for tenant admins.
 */
export class DeactivateProcessTemplateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  updatedBy?: number;
}
