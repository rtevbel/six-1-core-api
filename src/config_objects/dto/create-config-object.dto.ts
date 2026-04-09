import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import {
  ConfigObjectBindingMode,
  ConfigObjectStatus,
} from '../entities/config_object.entity';

/**
 * Create DTO for configuration objects.
 *
 * Used by admin APIs to create a new `config_objects` row. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class CreateConfigObjectDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configTemplateSetId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsIn(['sor_bound', 'standalone', 'system_table'])
  @IsOptional()
  bindingMode?: ConfigObjectBindingMode;

  /**
   * Required when `bindingMode` is `sor_bound` or `system_table`. Omit or null for
   * `standalone` (enforced in `ConfigObjectsService`).
   */
  @IsString()
  @IsOptional()
  sorTableName?: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  @IsOptional()
  status?: ConfigObjectStatus;
}

