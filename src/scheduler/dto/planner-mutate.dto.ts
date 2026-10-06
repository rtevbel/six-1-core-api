import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ScenarioPlanningKind } from '../constants';

const PLANNING_KINDS: ScenarioPlanningKind[] = [
  'task',
  'external',
  'milestone',
];

/**
 * Upsert a planned task from the Planner task sheet (core fields).
 */
export class PlannerTaskUpsertDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  taskId!: number;

  @IsDateString()
  plannedStartUtc!: string;

  @IsDateString()
  plannedEndUtc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tzUsed?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number | null;

  @IsOptional()
  @IsIn(PLANNING_KINDS)
  planningKind?: ScenarioPlanningKind;

  @IsOptional()
  @IsDateString()
  deadlineUtc?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPlanned?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isReady?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMilestone?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  taskName?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taskStatusId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

/**
 * Remove a planned task from a scenario (sheet delete).
 */
export class PlannerTaskRemoveDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  taskId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

/**
 * Preview conflicts for a proposed placement without saving.
 */
export class PlannerAssessDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  taskId!: number;

  @IsDateString()
  plannedStartUtc!: string;

  @IsDateString()
  plannedEndUtc!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number | null;
}

/**
 * Suggest free slots within a search window (default 14 days).
 */
export class PlannerSuggestDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  taskId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(60_000)
  @Max(7 * 24 * 60 * 60 * 1000)
  durationMs?: number;

  @IsOptional()
  @IsDateString()
  searchStartUtc?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  searchDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;
}
