import { IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateCategory.
 */
export class CreateProcessTemplateCategoryDto {
  /**
   * ID of the associated process template.
   * Optional when creating a new association.
   */
  @IsOptional()
  @IsNumber()
  processTemplateId!: number;

  /**
   * ID of the associated category.
   */
  @IsNumber()
  categoryId!: number;
}
