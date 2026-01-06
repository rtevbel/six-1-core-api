import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class FiltersResourceAvailabilityDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  resourceId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn(['availabilityId', 'startTime', 'endTime', 'resourceId'])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
