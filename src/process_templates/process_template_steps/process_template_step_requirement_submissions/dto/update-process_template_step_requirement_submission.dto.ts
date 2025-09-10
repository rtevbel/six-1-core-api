import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessTemplateStepRequirementSubmissionDto } from './create-process_template_step_requirement_submission.dto';

/**
 * DTO for updating an existing ProcessTemplateStepRequirementSubmission.
 */
export class UpdateProcessTemplateStepRequirementSubmissionDto extends PartialType(
  CreateProcessTemplateStepRequirementSubmissionDto,
) {
  /**
   * ID of the submission to be updated.
   */
  @IsNumber()
  stepRequirementSubmissionId!: number;
}
