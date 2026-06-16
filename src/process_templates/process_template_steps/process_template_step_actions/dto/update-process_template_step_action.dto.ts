import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessTemplateStepActionDto } from './create-process_template_step_action.dto';

export class UpdateProcessTemplateStepActionDto extends PartialType(
  CreateProcessTemplateStepActionDto,
) {
  @IsNumber()
  stepActionId!: number;
}
