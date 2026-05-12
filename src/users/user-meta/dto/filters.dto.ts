import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for user meta listing
 * (system_table catalog: `user_meta` / canonical `user_meta`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * User ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  userId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'userMetaId';
}
