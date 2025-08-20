import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepTriggerConditionDto } from './create-process_template_step_trigger_condition.dto';

export class UpdateProcessTemplateStepTriggerConditionDto extends PartialType(CreateProcessTemplateStepTriggerConditionDto) {
  id!: number;
}
