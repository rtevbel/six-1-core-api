import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ScheduleScenarioStatus } from '../constants';

/**
 * Create a scenario under a scheduling requirement.
 * Seed with `from: 'live'` or copy via `fromScenarioId` (mutually exclusive).
 */
export class CreateScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateIf((o: CreateScheduleScenarioDto) => o.fromScenarioId == null)
  @IsIn(['live'])
  from?: 'live';

  @IsOptional()
  @ValidateIf((o: CreateScheduleScenarioDto) => o.from !== 'live')
  @IsInt()
  @Type(() => Number)
  fromScenarioId?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activate?: boolean;
}

/**
 * Update scenario metadata (name / notes).
 */
export class UpdateScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Transition scenario status (draft | active | archived). Final is promote-only.
 */
export class SetScheduleScenarioStatusDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsIn(['draft', 'active', 'archived'])
  status!: Exclude<ScheduleScenarioStatus, 'final'>;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;
}

/**
 * Fork an existing scenario into a new draft (optionally activate).
 */
export class ForkScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activate?: boolean;
}

/**
 * Compare two scenarios under the same requirement.
 */
export class CompareScheduleScenariosDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  leftId!: number;

  @IsInt()
  @Type(() => Number)
  rightId!: number;
}

/**
 * Find a single schedule scenario.
 */
export class FindScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;
}

/**
 * Filters for listing scenarios under a requirement.
 */
export class FiltersScheduleScenarioDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsOptional()
  @IsIn(['draft', 'active', 'archived', 'final'])
  status?: ScheduleScenarioStatus;

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
 * Promote an active scenario to live.
 */
export class PromoteScheduleScenarioDto {
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
  @IsBoolean()
  @Type(() => Boolean)
  overrideHardConflicts?: boolean;
}
