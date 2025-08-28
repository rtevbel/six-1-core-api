import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessTemplateStepRequirementDto } from './create-process_template_step_requirement.dto';

/**
 * DTO for updating an existing ProcessTemplateStepRequirement.
 */
export class UpdateProcessTemplateStepRequirementDto extends PartialType(
  CreateProcessTemplateStepRequirementDto,
) {
  /**
   * ID of the process template step requirement to be updated.
   */
  @IsNumber()
  processTemplateStepRequirementId!: number;
}