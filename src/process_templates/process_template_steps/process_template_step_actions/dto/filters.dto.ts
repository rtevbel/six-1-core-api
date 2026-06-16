import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../../common/dto/catalog-dynamic-list-filter.dto';

/** Filters for `process_template_step_actions` listing. */
export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @Type(() => Number)
  @IsNumber()
  processTemplateStepId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'stepActionId';

  /** Omit for super-admin (global) scope; set from auth for tenant admins. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenantId?: number;
}
