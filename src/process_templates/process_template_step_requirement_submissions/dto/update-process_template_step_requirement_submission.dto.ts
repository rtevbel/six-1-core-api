import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepRequirementSubmissionDto } from './create-process_template_step_requirement_submission.dto';

export class UpdateProcessTemplateStepRequirementSubmissionDto extends PartialType(CreateProcessTemplateStepRequirementSubmissionDto) {
  id!: number;
}
