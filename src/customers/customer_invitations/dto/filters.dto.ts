import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const STATUS_VALUES = ['pending', 'accepted', 'declined'] as const;

export class FiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taskId?: number;

  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

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
  @IsIn(['invitationId', 'email', 'invitedAt'])
  @IsString()
  sortBy: string = 'invitationId';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder: string = 'DESC';
}
