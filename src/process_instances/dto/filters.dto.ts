import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for process instances listing
 * (system_table catalog: `process_instances`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Tenant ID is an optional scope filter; when provided, list is scoped to that tenant.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'processInstanceId';
}
