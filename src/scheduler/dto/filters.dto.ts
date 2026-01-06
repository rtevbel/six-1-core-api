import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class FiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taskId?: number;

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
  @IsIn([
    'scheduledTaskId',
    'taskId',
    'effectiveStartUtc',
    'effectiveEndUtc',
    'createdAt',
  ])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
