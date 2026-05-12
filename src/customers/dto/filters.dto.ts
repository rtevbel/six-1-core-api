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
import { SorStructuredFilterConditionDto } from '../../common/dto/sor-structured-filter-condition.dto';

/** @deprecated Use {@link SorStructuredFilterConditionDto}. */
export type CustomerFilterConditionDto = SorStructuredFilterConditionDto;

/**
 * DTO for filtering and paginating customer queries.
 */
export class FiltersDto {
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
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'customerId';

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
}
