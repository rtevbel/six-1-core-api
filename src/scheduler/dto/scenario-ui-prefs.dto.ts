import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PLANNING_LENS_IDS } from '../constants';

export class ScenarioUiPrefsPanelsDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  resources?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  equipment?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  material?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  subcontractors?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  map?: boolean;
}

export class ScenarioUiPrefsEnvelopeDto {
  @IsOptional()
  @IsIn([...PLANNING_LENS_IDS])
  planningLensId?: (typeof PLANNING_LENS_IDS)[number];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  advancedKpis?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  linkBoards?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScenarioUiPrefsPanelsDto)
  panels?: ScenarioUiPrefsPanelsDto;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  theme?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string | null;
}

export class GetScheduleScenarioUiPrefsDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;
}

export class SetScheduleScenarioUiPrefsDto {
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

  @IsObject()
  @ValidateNested()
  @Type(() => ScenarioUiPrefsEnvelopeDto)
  uiPrefs!: ScenarioUiPrefsEnvelopeDto;

  /** When true, replace the entire envelope; otherwise shallow-merge (panels deep-merged). */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  replace?: boolean;
}
