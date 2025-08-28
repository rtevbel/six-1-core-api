import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepDescriptionDto } from './create-process_template_step_description.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateStepDescription.
 */
export class UpdateProcessTemplateStepDescriptionDto extends PartialType(
  CreateProcessTemplateStepDescriptionDto,
) {
  /**
   * ID of the process template step description to be updated.
   */
  @IsNumber()
  processTemplateStepDescriptionId!: number;
}
