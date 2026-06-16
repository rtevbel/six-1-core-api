import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class FiltersDto {
  /**
   * Tenant scope filter. Omit for super-admin (all tenants + global).
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
