import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateDto } from './create-process_template.dto';

export class UpdateProcessTemplateDto extends PartialType(CreateProcessTemplateDto) {
  id!: number;
}
