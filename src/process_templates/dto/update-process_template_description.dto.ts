import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateDescriptionDto } from './create-process_template_description.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateDescription.
 * Extends CreateProcessTemplateDescriptionDto with optional fields.
 */
export class UpdateProcessTemplateDescriptionDto extends PartialType(
  CreateProcessTemplateDescriptionDto,
) {
  /**
   * ID of the associated process template.
   */
  @IsNumber()
  processTemplateDescriptionId!: number;
}
