import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
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
   * Task type of the step (manual or automated).
   */
  @IsEnum(['manual', 'automated'])
  taskType!: 'manual' | 'automated';

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
