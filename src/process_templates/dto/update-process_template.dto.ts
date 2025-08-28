import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateDto } from './create-process_template.dto';
import { UpdateProcessTemplateDescriptionDto } from './update-process_template_description.dto';
import { UpdateProcessTemplateCategoryDto } from './update-process_template_category.dto';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating an existing ProcessTemplate.
 * Extends CreateProcessTemplateDto with optional fields.
 */
export class UpdateProcessTemplateDto extends PartialType(
  OmitType(CreateProcessTemplateDto, ['descriptions', 'categories'] as const),
) {
  /**
   * ID of the process template to be updated.
   */
  @IsNumber()
  processTemplateId!: number;

  /**
   * List of descriptions associated with the process template.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateDescriptionDto)
  descriptions?: UpdateProcessTemplateDescriptionDto[];

  /**
   * List of categories associated with the process template.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateCategoryDto)
  categories?: UpdateProcessTemplateCategoryDto[];
}
