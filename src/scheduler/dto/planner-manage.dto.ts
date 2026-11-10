import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MANAGE_RECORD_CATEGORIES,
  ManageRecordCategory,
} from '../constants';

/**
 * List scenario-scoped Manage draft records (Option A).
 */
export class PlannerManageListDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsIn(MANAGE_RECORD_CATEGORIES)
  category?: ManageRecordCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string | null;

  @IsOptional()
  @IsUUID('4')
  recordKey?: string | null;

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

/**
 * Create or update a Manage draft record.
 */
export class PlannerManageUpsertDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsOptional()
  @IsUUID('4')
  recordKey?: string | null;

  @IsIn(MANAGE_RECORD_CATEGORIES)
  category!: ManageRecordCategory;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID('4')
  parentRecordKey?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  linkedMasterId?: number | null;

  @IsOptional()
  @IsObject()
  attrs?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;
}

/**
 * Catalog of Manage categories for process-driven / Object Runner UI (Phase 2).
 * No scenario required — keys and field schemas are platform defaults.
 */
export class PlannerManageCatalogDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;
}

/**
 * Field schema for one Manage category (scenario-draft Runner).
 */
export class PlannerManageSchemaDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsIn(MANAGE_RECORD_CATEGORIES)
  category!: ManageRecordCategory;
}

/**
 * Resolve one Manage draft record for Object Runner (by recordKey).
 */
export class PlannerManageResolveDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsUUID('4')
  recordKey!: string;
}

/**
 * Remove a Manage draft record (referential protection may block).
 */
export class PlannerManageRemoveDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  scheduleScenarioId!: number;

  @IsUUID('4')
  recordKey!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  expectedRevision?: number;
}
