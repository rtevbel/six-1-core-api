import { IsIn, IsOptional, IsString } from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * FiltersDto for category list queries (`system_table` / existing REST).
 * Accepts shared list query params from the gateway (`sortSource`, `includeMeta`, …).
 * Structured filters are core columns only; meta/related are not supported.
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Field to sort by. Core columns on {@link CategoryEntity} (descriptions use separate load).
   */
  @IsOptional()
  @IsIn(
    [
      'categoryId',
      'tenantId',
      'statusId',
      'groupName',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
    ],
    {
      message:
        'sortBy must be a core category column (categoryId, tenantId, statusId, groupName, createdBy, updatedBy, createdAt, updatedAt)',
    },
  )
  @IsString()
  sortBy: string = 'categoryId';
}
