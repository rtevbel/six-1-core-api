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
 * Filters for tenant user listing (`tenant_users`, canonical `tenant_user`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @Type(() => Number)
  @IsNumber()
  tenantId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'tenantUserId';
}
