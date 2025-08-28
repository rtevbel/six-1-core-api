import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepDto } from './create-process_template_step.dto';
import { UpdateProcessTemplateStepDescriptionDto } from './update-process_template_step_description.dto';
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating an existing ProcessTemplateStep.
 */
export class UpdateProcessTemplateStepDto extends PartialType(
  OmitType(CreateProcessTemplateStepDto, ['descriptions'] as const),
) {
  /**
   * ID of the process template step to be updated.
   */
  @IsNumber()
  processTemplateStepId!: number;

  /**
   * List of descriptions associated with the step (optional).
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateStepDescriptionDto)
  descriptions?: UpdateProcessTemplateStepDescriptionDto[];
}
