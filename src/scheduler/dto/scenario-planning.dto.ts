import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Nested shift row for scenario planned-task upsert.
 */
export class ScenarioPlannedShiftInputDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  sequenceNo!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  resourceId?: number | null;

  @IsDateString()
  plannedStartUtc!: string;

  @IsDateString()
  plannedEndUtc!: string;
}

/**
 * Nested resource assignment for scenario planned-task upsert.
 */
export class ScenarioResourceAssignmentInputDto {
  @IsInt()
  @Type(() => Number)
  resourceId!: number;

  @IsDateString()
  assignedStart!: string;

  @IsDateString()
  assignedEnd!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  scenarioPlannedShiftId?: number | null;
}

/**
 * Upsert a planned task (parent window) with optional shifts and assignments.
 */
export class UpsertScenarioPlannedTaskDto {
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
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taskStatusId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioPlannedShiftInputDto)
  shifts?: ScenarioPlannedShiftInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioResourceAssignmentInputDto)
  assignments?: ScenarioResourceAssignmentInputDto[];
}

/**
 * Remove a planned task from a scenario.
 */
export class RemoveScenarioPlannedTaskDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  taskId!: number;
}

/**
 * List planned tasks for a scenario.
 */
export class FindScenarioPlannedTasksDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;
}
