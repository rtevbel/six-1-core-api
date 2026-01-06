import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class FiltersDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

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
  @IsIn(['customerContactId', 'secondaryEmail', 'createdAt'])
  @IsString()
  sortBy: string = 'customerContactId';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder: string = 'DESC';
}
