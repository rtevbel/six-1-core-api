import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for system languages listing
 * (system_table catalog: `system_languages` / canonical `system_language`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'languageId';
}
