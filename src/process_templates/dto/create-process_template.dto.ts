import { IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProcessTemplateDescriptionDto } from './create-process_template_description.dto';
import { CreateProcessTemplateCategoryDto } from './create-process_template_category.dto';

/**
 * DTO for creating a new ProcessTemplate.
 */
export class CreateProcessTemplateDto {
  /**
   * Tenant ID who owns this process template.
   */
  @IsNumber()
  tenantId!: number;

  /**
   * Tenant User ID who created this process template.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Tenant User ID who last updated this process template (optional).
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;

  /**
   * List of descriptions associated with the process template.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessTemplateDescriptionDto)
  descriptions!: CreateProcessTemplateDescriptionDto[];

  /**
   * List of categories associated with the process template.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessTemplateCategoryDto)
  categories!: CreateProcessTemplateCategoryDto[];
}
