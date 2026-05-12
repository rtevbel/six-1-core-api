import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for tenant types listing
 * (system_table catalog: `tenant_types` / canonical `tenant_type`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'tenantTypeId';
}
