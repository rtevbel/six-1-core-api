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
 * Filters for process instance step requirements listing
 * (system_table catalog: `process_instance_step_requirements`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Step Instance ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  stepInstanceId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'requirementInstanceId';
}
