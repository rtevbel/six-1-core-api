import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { SorStructuredFilterConditionDto } from '../../common/dto/sor-structured-filter-condition.dto';

export class FiltersResourceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantUserId?: number;

  @IsOptional()
  @IsEnum(['equipment', 'human'])
  type?: 'equipment' | 'human';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(['core', 'meta'])
  @IsString()
  sortSource?: 'core' | 'meta';

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
