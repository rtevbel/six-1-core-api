import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for tenants listing (system_table catalog: `tenants` / canonical `tenant`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'tenantId';
}
