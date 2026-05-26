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
 * Filters for process template step object bindings listing
 * (system_table catalog: `process_template_step_object_bindings`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @Type(() => Number)
  @IsNumber()
  processTemplateStepId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'bindingId';
}
