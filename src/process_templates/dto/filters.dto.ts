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
 * Filters for process templates listing
 * (system_table catalog: `process_templates` / canonical `process_template`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Tenant ID is optional scope for this listing.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'processTemplateId';
}
