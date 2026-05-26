import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  ValidateIf,
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
  @IsEnum(['manual', 'automated', 'call_process', 'config_object'])
  taskType!: 'manual' | 'automated' | 'call_process' | 'config_object';

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
