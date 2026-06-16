import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import {
  PROCESS_STEP_ACTION_RUN_ON_VALUES,
  PROCESS_STEP_ACTION_TYPES,
  type ProcessStepActionRunOn,
  type ProcessStepActionType,
} from '../../../../automation/process-step-action.constants';

export class CreateProcessTemplateStepActionDto {
  @IsNumber()
  processTemplateStepId!: number;

  @IsIn(PROCESS_STEP_ACTION_TYPES)
  actionType!: ProcessStepActionType;

  @IsIn(PROCESS_STEP_ACTION_RUN_ON_VALUES)
  runOn!: ProcessStepActionRunOn;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNumber()
  createdBy!: number;

  @IsOptional()
  @IsNumber()
  updatedBy?: number;

  /** Omit for super-admin (global) scope; set from auth for tenant admins. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tenantId?: number;
}
