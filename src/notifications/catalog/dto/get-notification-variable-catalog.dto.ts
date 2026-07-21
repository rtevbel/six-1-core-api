import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Variable catalog scope for template authoring.
 *
 * For tenant-scoped configuration `tenantId` should be provided; for
 * system-level (superadmin / global template-set management) it may be
 * omitted and global published schemas are used.
 */
export class GetNotificationVariableCatalogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  eventName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  objectType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  processTemplateId?: number;
}
