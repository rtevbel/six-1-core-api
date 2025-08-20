import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './create-process_template_step_trigger_condition_submission.dto';

export class UpdateProcessTemplateStepTriggerConditionSubmissionDto extends PartialType(CreateProcessTemplateStepTriggerConditionSubmissionDto) {
  id!: number;
}
