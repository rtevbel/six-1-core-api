import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepDto } from './create-process_template_step.dto';

export class UpdateProcessTemplateStepDto extends PartialType(CreateProcessTemplateStepDto) {
  id!: number;
}
