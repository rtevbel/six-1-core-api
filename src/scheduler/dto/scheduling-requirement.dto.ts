import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  SchedulingRequirementMemberType,
  SchedulingRequirementScopeType,
  SchedulingRequirementStatus,
} from '../constants';

/**
 * Partial promote policy overrides for a scheduling requirement.
 */
export class SchedulingPromotePolicyDto {
  @IsOptional()
  @IsIn(['active_only'])
  promoteFrom?: 'active_only';

  @IsOptional()
  @IsIn(['block', 'force_cancel'])
  inFlight?: 'block' | 'force_cancel';

  @IsOptional()
  @IsIn(['horizon_and_members_only'])
  scope?: 'horizon_and_members_only';

  @IsOptional()
  @IsIn(['leave_untouched'])
  outsideScopeLive?: 'leave_untouched';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowHardConflictOverride?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archiveOtherDraftsOnPromote?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeTerminal?: boolean;
}

/**
 * Membership entry for a board-scoped scheduling requirement.
 */
export class SchedulingRequirementMemberDto {
  @IsIn(['project', 'task'])
  memberType!: SchedulingRequirementMemberType;

  @IsInt()
  @Type(() => Number)
  memberId!: number;
}

/**
 * Create a scheduling requirement (project or board scope).
 */
export class CreateSchedulingRequirementDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['project', 'board'])
  scopeType!: SchedulingRequirementScopeType;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  primaryProjectId?: number;

  @IsDateString()
  horizonStartUtc!: string;

  @IsDateString()
  horizonEndUtc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  requirementKey?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingPromotePolicyDto)
  promotePolicy?: SchedulingPromotePolicyDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchedulingRequirementMemberDto)
  members?: SchedulingRequirementMemberDto[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  createdBy?: number;
}

/**
 * Update an open scheduling requirement.
 */
export class UpdateSchedulingRequirementDto {
  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  horizonStartUtc?: string;

  @IsOptional()
  @IsDateString()
  horizonEndUtc?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingPromotePolicyDto)
  promotePolicy?: SchedulingPromotePolicyDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchedulingRequirementMemberDto)
  members?: SchedulingRequirementMemberDto[];
}

/**
 * Filters for listing scheduling requirements.
 */
export class FiltersSchedulingRequirementDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsOptional()
  @IsIn(['open', 'locked', 'closed'])
  status?: SchedulingRequirementStatus;

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
 * Close (or look up) a scheduling requirement by id + tenant.
 */
export class CloseSchedulingRequirementDto {
  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsInt()
  @Type(() => Number)
  tenantId!: number;
}
