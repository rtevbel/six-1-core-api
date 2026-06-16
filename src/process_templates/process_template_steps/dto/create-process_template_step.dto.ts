import {
  IsNumber,
  IsOptional,
  IsIn,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  ValidateIf,
  IsString,
  IsEnum,
  ArrayMaxSize,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProcessTemplateStepDescriptionDto } from './create-process_template_step_description.dto';

/**
 * DTO for creating a new ProcessTemplateStep.
 */
export class CreateProcessTemplateStepDto {
  /**
   * ID of the associated process template.
   */
  @IsNumber()
  processTemplateId!: number;

  /**
   * Task type of the step.
   */
  @IsIn(['manual', 'automated', 'call_process'])
  taskType!: 'manual' | 'automated' | 'call_process';

  /**
   * Child template when taskType is call_process.
   */
  @ValidateIf((o) => o.taskType === 'call_process')
  @IsNumber()
  childTemplateId?: number;

  @IsOptional()
  @IsEnum(['inherit', 'workflow', 'config_instance'])
  childSubjectPolicy?: 'inherit' | 'workflow' | 'config_instance';

  @IsOptional()
  @IsObject()
  childContextPatch?: Record<string, unknown>;

  /**
   * Order of the step in the process.
   */
  @IsNumber()
  stepOrder!: number;

  /**
   * Indicates if the step is optional.
   */
  @IsBoolean()
  isOptional!: boolean;

  /**
   * Permission keys a caller must hold to complete this step (Runner + RPC).
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  @Matches(/^[A-Za-z0-9_.]+$/, { each: true })
  requiredPermissions?: string[];

  /**
   * Tenant User ID who created this step.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Tenant User ID who last updated this step (optional).
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;

  /**
   * List of descriptions associated with the step.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessTemplateStepDescriptionDto)
  descriptions!: CreateProcessTemplateStepDescriptionDto[];
}
