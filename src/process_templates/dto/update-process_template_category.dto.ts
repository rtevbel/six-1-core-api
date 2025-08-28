import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateCategoryDto } from './create-process_template_category.dto';

/**
 * DTO for updating an existing ProcessTemplateCategory.
 * Extends CreateProcessTemplateCategoryDto with optional fields.
 */
export class UpdateProcessTemplateCategoryDto extends PartialType(
  CreateProcessTemplateCategoryDto,
) {}
