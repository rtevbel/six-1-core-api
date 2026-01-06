import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
  @IsIn(['customerId', 'email', 'createdAt'])
  @IsString()
  sortBy: string = 'customerId';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder: string = 'DESC';
}
