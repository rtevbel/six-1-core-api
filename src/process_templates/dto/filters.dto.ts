import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../common/dto/catalog-dynamic-list-filter.dto';
import { ProcessTemplateStatus } from '../entities/process_template.entity';

/**
 * Filters for process templates listing
 * (system_table catalog: `process_templates` / canonical `process_template`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Tenant scope: omit for super-admin (all tenants); positive id for one tenant;
   * `0` for system/global templates only.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

  /** Filter by a single lifecycle status (convenience for list UIs). */
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  status?: ProcessTemplateStatus;

  /** Filter by multiple statuses (OR). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'], { each: true })
  statuses?: ProcessTemplateStatus[];

  /**
   * When set, only templates that have at least one step object binding
   * referencing this config object are returned (Create Process applicability).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  configObjectId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'processTemplateId';
}
