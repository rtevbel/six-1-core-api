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
  @IsIn(['role_id', 'name', 'description'], {
    message: 'sortBy key must be from this list (role_id,name,description)',
  })
  @IsString()
  sortBy?: string = 'role_id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: "SortOrder key must be from this list ('ASC','DESC')",
  })
  @IsString()
  sortOrder?: string = 'DESC';
}
