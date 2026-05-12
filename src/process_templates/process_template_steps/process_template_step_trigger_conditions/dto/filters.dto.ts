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
 * Filters for process template step trigger conditions listing
 * (system_table catalog: `process_template_step_trigger_conditions`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Process Template Step ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  processTemplateStepId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'stepTriggerConditionId';
}
