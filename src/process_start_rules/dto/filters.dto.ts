import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class FiltersDto {
  @IsString()
  @MaxLength(255)
  eventName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number = 10;
}
