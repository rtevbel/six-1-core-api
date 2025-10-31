import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessInstanceStepRequirementSubmissionDto } from './create-process_instance_step_requirement_submission.dto';

/**
 * DTO for updating an existing ProcessInstanceStepRequirementSubmission.
 */
export class UpdateProcessInstanceStepRequirementSubmissionDto extends PartialType(
  CreateProcessInstanceStepRequirementSubmissionDto,
) {
  /**
   * ID of the submission to be updated.
   */
  @IsNumber()
  requirementSubmissionId!: number;
}
