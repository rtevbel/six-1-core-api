import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessTemplateStepObjectBindingDto } from './create-process_template_step_object_binding.dto';

export class UpdateProcessTemplateStepObjectBindingDto extends PartialType(
  CreateProcessTemplateStepObjectBindingDto,
) {
  @IsNumber()
  bindingId!: number;
}
