import { IsNumber, IsString, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new ProcessTemplateDescription.
 */
export class CreateProcessTemplateDescriptionDto {
  /**
   * ID of the associated process template.
   * Optional when creating a new description.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  processTemplateId!: number;

  /**
   * ID of the associated language.
   */
  @Type(() => Number)
  @IsNumber()
  languageId!: number;

  /**
   * Name of the process template description.
   * Example: HVAC Installation, IT Project Setup.
   */
  @IsString()
  @MaxLength(255)
  name!: string;

  /**
   * Detailed description of the process template (optional).
   */
  @IsOptional()
  @IsString()
  description?: string;
}
