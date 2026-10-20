import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PLANNER_SCALES = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;
export type PlannerScale = (typeof PLANNER_SCALES)[number];

export const PLANNER_ATTENTION = ['all', 'blocked', 'critical'] as const;
export type PlannerAttention = (typeof PLANNER_ATTENTION)[number];

export const PLANNER_VIEWS = ['projects', 'people', 'both'] as const;
export type PlannerView = (typeof PLANNER_VIEWS)[number];

/**
 * Shared query for board / KPIs / conflicts reads.
 */
export class PlannerReadQueryDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  scheduleScenarioId?: number;

  @IsOptional()
  @IsIn(PLANNER_SCALES)
  scale?: PlannerScale;

  @IsOptional()
  @IsDateString()
  rangeStart?: string;

  @IsOptional()
  @IsDateString()
  rangeEnd?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(PLANNER_ATTENTION)
  attention?: PlannerAttention;

  @IsOptional()
  @IsIn(PLANNER_VIEWS)
  view?: PlannerView;
}

export const PLANNER_QUEUE_REASONS = [
  'unplanned',
  'unassigned',
  'no_date',
] as const;
export type PlannerQueueReason = (typeof PLANNER_QUEUE_REASONS)[number];

/**
 * Work queue: unplanned / unassigned items for the Impact → queue dock.
 */
export class PlannerQueueQueryDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  scheduleScenarioId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(PLANNER_QUEUE_REASONS)
  reason?: PlannerQueueReason;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
