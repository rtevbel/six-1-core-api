import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScenarioPlanningKind } from '../constants';

const PLANNING_KINDS: ScenarioPlanningKind[] = [
  'task',
  'external',
  'milestone',
];

const DEP_TYPES = ['FS', 'SS', 'FF', 'SF'] as const;

export class PlannerSheetMaterialRefDto {
  @IsString()
  @MaxLength(64)
  recordKey!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  qty!: number;
}

export class PlannerSheetPredecessorDto {
  @IsInt()
  @Type(() => Number)
  dependsOnTaskId!: number;

  @IsIn(DEP_TYPES)
  dependencyType!: (typeof DEP_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  lagDays?: number;
}

/** Rich task sheet extras (Week 8). */
export class PlannerSheetExtrasDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  partnerRecordKeys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => PlannerSheetMaterialRefDto)
  requiredMaterials?: PlannerSheetMaterialRefDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredEquipmentRecordKeys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  assignedEquipmentRecordKeys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => PlannerSheetPredecessorDto)
  predecessors?: PlannerSheetPredecessorDto[];
}

/**
 * Upsert a planned task from the Planner task sheet (core + rich extras).
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

  /** Omit to leave stored extras unchanged; send object to replace. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PlannerSheetExtrasDto)
  sheetExtras?: PlannerSheetExtrasDto;
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

  @IsOptional()
  @IsIn(PLANNING_KINDS)
  planningKind?: ScenarioPlanningKind;

  /** Optional extras for PARTNER_MISSING preview before save. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PlannerSheetExtrasDto)
  sheetExtras?: PlannerSheetExtrasDto;
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

/**
 * Impact Apply: persist placement (upsert) and append constraint event log.
 */
export class PlannerImpactApplyDto extends PlannerTaskUpsertDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  acknowledgeOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string | null;
}
