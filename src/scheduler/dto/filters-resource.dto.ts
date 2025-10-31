import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';

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
  @IsIn(['resourceId', 'name', 'tenantId', 'type'])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

