import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlatformEventRecordFiltersDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  correlationId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  tenantId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  entityType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  entityId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  eventName?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  occurredAfter?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  occurredBefore?: Date;

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class EventTimelineFiltersDto {
  /**
   * Primary lookup key. When omitted, provide tenant + entity or time bounds.
   */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  correlationId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  tenantId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  entityType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  entityId?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  occurredAfter?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  occurredBefore?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
