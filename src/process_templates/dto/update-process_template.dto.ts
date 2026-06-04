import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateDto } from './create-process_template.dto';
import { UpdateProcessTemplateDescriptionDto } from './update-process_template_description.dto';
import { UpdateProcessTemplateCategoryDto } from './update-process_template_category.dto';
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
import { ProcessTemplateStatus } from '../entities/process_template.entity';

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
   * Tenant scope for the update. Omit for super-admin (resolve by template id only).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  status?: ProcessTemplateStatus;

  /**
   * List of descriptions associated with the process template.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateDescriptionDto)
  descriptions?: UpdateProcessTemplateDescriptionDto[];

  /**
   * List of categories associated with the process template.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProcessTemplateCategoryDto)
  categories?: UpdateProcessTemplateCategoryDto[];
}
