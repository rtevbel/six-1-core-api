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
 * Filters for tenant subscriptions listing
 * (system_table catalog: `tenant_subscriptions`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Tenant ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  tenantId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'subscriptionId';
}
