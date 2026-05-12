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
 * Filters for process template step requirement submissions listing
 * (system_table catalog: `process_template_step_requirement_submissions`).
 */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  /**
   * Process Template Step Requirement ID is mandatory scope for this listing.
   */
  @Type(() => Number)
  @IsNumber()
  processTemplateStepRequirementId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'stepRequirementSubmissionId';
}
