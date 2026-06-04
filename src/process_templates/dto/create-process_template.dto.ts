import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProcessTemplateDescriptionDto } from './create-process_template_description.dto';
import { CreateProcessTemplateCategoryDto } from './create-process_template_category.dto';
import { ProcessTemplateStatus } from '../entities/process_template.entity';

/**
 * DTO for creating a new ProcessTemplate.
 */
export class CreateProcessTemplateDto {
  /**
   * Tenant owner. Omit or use `0` for system/global templates (super-admin);
   * provide a positive id for tenant-scoped templates.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

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
   * Lifecycle status (defaults to DRAFT when omitted).
   */
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  status?: ProcessTemplateStatus;

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
