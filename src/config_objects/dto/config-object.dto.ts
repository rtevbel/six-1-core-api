import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  ConfigObjectBindingMode,
  ConfigObjectStatus,
} from '../entities/config_object.entity';
export { CreateConfigObjectDto } from './create-config-object.dto';
export { UpdateConfigObjectDto } from './update-config-object.dto';
export { DeleteConfigObjectDto } from './delete-config-object.dto';

/**
 * List DTO for configuration objects.
 *
 * Used to page/filter `config_objects` rows for a tenant and optional
 * template set.
 *
 * For tenant-scoped configuration `tenantId` should be provided; for
 * system-level (superadmin / global template-set management) it may be
 * omitted and derived from auth context.
 */
export class ListConfigObjectsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  configTemplateSetId?: number;

  /**
   * Optional object type filter (e.g. `project`, `task`).
   * Currently accepted for compatibility with gateway payloads and ignored
   * by the service implementation.
   */
  @IsString()
  @IsOptional()
  objectType?: string;

  @IsString()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  @IsOptional()
  status?: ConfigObjectStatus;

  @IsString()
  @IsIn(['sor_bound', 'standalone', 'system_table'])
  @IsOptional()
  bindingMode?: ConfigObjectBindingMode;
}

