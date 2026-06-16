import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { PlatformActionType } from '../types/platform-action.types';

export class PlatformActionFiltersDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsOptional()
  @IsIn(['emit_event', 'send_notification'])
  actionType?: PlatformActionType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
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
