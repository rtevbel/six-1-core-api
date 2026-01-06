import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class FiltersResourceAssignmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  resourceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  scheduledTaskId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn([
    'resourceAssignmentId',
    'resourceId',
    'scheduledTaskId',
    'assignedStart',
  ])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
