import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './create-process_template_step_trigger_condition_submission.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateStepTriggerConditionSubmission.
 */
export class UpdateProcessTemplateStepTriggerConditionSubmissionDto extends PartialType(
  CreateProcessTemplateStepTriggerConditionSubmissionDto,
) {
  /**
   * ID of the step trigger condition submission to be updated.
   */
  @IsNumber()
  stepTriggerConditionSubmissionId!: number;
}