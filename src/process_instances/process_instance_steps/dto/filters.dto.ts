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
 * Filters for process instance steps listing
 * (system_table catalog: `process_instance_steps`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Process Instance ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  processInstanceId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'stepInstanceId';
}
