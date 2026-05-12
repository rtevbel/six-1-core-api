import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { SorStructuredFilterConditionDto } from './sor-structured-filter-condition.dto';

/**
 * Shared pagination / sorting / structured filter block for catalog-backed lists
 * (`system_table`, `sor_bound`, junction SoR helpers).
 *
 * Extend in feature filters DTOs and add mandatory scope (`tenantId`, etc.).
 */
export class CatalogDynamicListFiltersMixin {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder: string = 'DESC';

  @IsOptional()
  @IsIn(['core', 'meta'])
  @IsString()
  sortSource: 'core' | 'meta' = 'core';

  @IsOptional()
  @Type(() => Boolean)
  includeMeta?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SorStructuredFilterConditionDto)
  filters?: SorStructuredFilterConditionDto[];

  /** Optional tenant for list-field-catalog resolution (system scope when omitted). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  catalogTenantId?: number;
}
