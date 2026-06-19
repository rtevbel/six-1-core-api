import { UpdateProcessTemplateStepDescriptionDto } from './update-process_template_step_description.dto';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating an existing ProcessTemplateStep.
 * Fields are explicit (not PartialType) so RPC whitelist retains validators.
 */
export class UpdateProcessTemplateStepDto {
  @IsNumber()
  @Type(() => Number)
  processTemplateStepId!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  processTemplateId?: number;

  @IsOptional()
  @IsIn(['manual', 'automated', 'call_process'])
  taskType?: 'manual' | 'automated' | 'call_process';

  @IsOptional()
  @ValidateIf((o) => o.taskType === 'call_process')
  @IsNumber()
  @Type(() => Number)
  childTemplateId?: number;

  @IsOptional()
  @IsIn(['inherit', 'workflow', 'config_instance'])
  childSubjectPolicy?: 'inherit' | 'workflow' | 'config_instance';

  @IsOptional()
  @IsObject()
  childContextPatch?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  assigneeSpec?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stepOrder?: number;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  updatedBy?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateStepDescriptionDto)
  descriptions?: UpdateProcessTemplateStepDescriptionDto[];
}
