import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PLANNER_PLANNING_PHASES,
  PLANNER_PROCESS_RUN_ACTIONS,
  PlannerPlanningPhase,
  PlannerProcessRunAction,
} from '../constants';

const DEP_TYPES = ['FS', 'SS', 'FF', 'SF'] as const;

export class PlannerTaskSplitDto {
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
  splitAtUtc!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

export class PlannerTaskMergeDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  keepTaskId!: number;

  @IsInt()
  @Type(() => Number)
  absorbTaskId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

export class PlannerDependencySetDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsInt()
  @Type(() => Number)
  fromTaskId!: number;

  @IsInt()
  @Type(() => Number)
  toTaskId!: number;

  @IsIn(DEP_TYPES)
  dependencyType!: (typeof DEP_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  lagDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

export class PlannerPhaseDockQueryDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number | null;
}

export class PlannerDockTemplateApplyDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsString()
  @MaxLength(64)
  templateId!: string;

  @IsInt()
  @Type(() => Number)
  projectId!: number;

  @IsDateString()
  plannedStartUtc!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantUserId?: number | null;

  @IsOptional()
  @IsIn(PLANNER_PLANNING_PHASES)
  planningPhase?: PlannerPlanningPhase;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}

export class PlannerProcessRunsListDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  /** When set, return only runs for this task (drawer Process section). */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taskId?: number;
}

export class PlannerProcessRunAppendDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsIn(PLANNER_PROCESS_RUN_ACTIONS)
  action!: PlannerProcessRunAction;

  @IsString()
  @MaxLength(128)
  label!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taskId?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number | null;

  @IsOptional()
  @IsIn(['ok', 'warn'])
  status?: 'ok' | 'warn';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  expectedRevision?: number;
}
