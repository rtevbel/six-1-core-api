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
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsIn(['permission_id', 'name', 'description'], {
    message:
      'sortBy key must be from this list (permission_id,name,description)',
  })
  @IsString()
  sortBy?: string = 'permission_id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: "SortOrder key must be from this list ('ASC','DESC')",
  })
  @IsString()
  sortOrder?: string = 'DESC';
}
