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
  taskId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

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
  @IsIn(['customerTaskMemberId', 'joinedAt'])
  @IsString()
  sortBy: string = 'customerTaskMemberId';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder: string = 'DESC';
}
