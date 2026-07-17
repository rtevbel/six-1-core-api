import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../common/dto/catalog-dynamic-list-filter.dto';

/**
 * Filters for notification template list queries.
 * Accepts shared list query params from the gateway (`sortSource`, `includeMeta`, …).
 * Structured filters / meta sort are not supported (core columns only).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Filter templates by notification channel ID.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  channelId?: number;

  /**
   * Field to sort by. Core columns on notification_templates only.
   */
  @IsOptional()
  @IsIn(['templateId', 'channelId', 'name'], {
    message: 'sortBy key must be from this list (templateId, channelId , name)',
  })
  @IsString()
  sortBy: string = 'templateId';
}
