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
import { SorStructuredFilterConditionDto } from '../../../common/dto/sor-structured-filter-condition.dto';

/**
 * FiltersDto class for handling query parameters on task lists.
 */
export class FiltersDto {
  @Type(() => Number)
  @IsNumber()
  projectId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

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
  sortBy: string = 'taskId';

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
