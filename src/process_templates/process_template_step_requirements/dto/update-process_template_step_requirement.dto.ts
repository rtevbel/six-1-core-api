import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepRequirementDto } from './create-process_template_step_requirement.dto';

export class UpdateProcessTemplateStepRequirementDto extends PartialType(CreateProcessTemplateStepRequirementDto) {
  id!: number;
}
