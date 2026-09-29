import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Persist current overlay as a named version (bumps revision).
 */
export class SaveScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  summary?: string;
}

/**
 * Make final — crown scenario as definitive (no live / job writes).
 */
export class MarkScheduleScenarioDefinitiveDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;
}

/**
 * List version history for a scenario.
 */
export class ListScheduleScenarioVersionsDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}

/**
 * Get one version (includes overlay JSON).
 */
export class GetScheduleScenarioVersionDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  version!: number;
}

/**
 * Restore overlay from a historical version into the working scenario.
 */
export class RestoreScheduleScenarioVersionDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  version!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;
}
