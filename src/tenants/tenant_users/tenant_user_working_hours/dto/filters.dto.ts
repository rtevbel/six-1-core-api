import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for tenant user working hours listing
 * (system_table catalog: `tenant_user_working_hours`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Tenant User ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  tenantUserId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'tenantUserWorkingHourId';
}
