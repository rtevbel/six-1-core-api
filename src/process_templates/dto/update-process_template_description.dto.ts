import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateDescriptionDto } from './create-process_template_description.dto';
import { IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateDescription.
 * Extends CreateProcessTemplateDescriptionDto with optional fields.
 */
export class UpdateProcessTemplateDescriptionDto extends PartialType(
  CreateProcessTemplateDescriptionDto,
) {
  /**
   * ID of the existing process template description.
   * When provided, the record will be updated; when omitted, a new description
   * will be created during update.
   */
  @IsOptional()
  @IsNumber()
  processTemplateDescriptionId?: number;
}
