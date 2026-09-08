import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';

/**
 * Dry-run placement validation against ConstraintCapacityEngine.
 */
export class ValidatePlacementDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taskId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number | null;

  @IsDateString()
  startUtc!: string;

  @IsDateString()
  endUtc!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  teamId?: number | null;

  @IsOptional()
  @IsIn(['parent_window', 'shift', 'assignment'])
  mode?: 'parent_window' | 'shift' | 'assignment';

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  excludeScheduledTaskIds?: number[];

  @IsOptional()
  @IsDateString()
  horizonStartUtc?: string;

  @IsOptional()
  @IsDateString()
  horizonEndUtc?: string;
}

/**
 * Utilization query for people / equipment / team load.
 */
export class UtilizationQueryDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsDateString()
  fromUtc!: string;

  @IsDateString()
  toUtc!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  resourceIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  tenantUserIds?: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  teamId?: number;
}
