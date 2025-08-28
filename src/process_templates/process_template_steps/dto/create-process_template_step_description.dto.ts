import { IsNumber, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateStepDescription.
 */
export class CreateProcessTemplateStepDescriptionDto {
  /**
   * ID of the associated process template step.
   */
  @IsOptional()
  @IsNumber()
  processTemplateStepId!: number;

  /**
   * ID of the associated language.
   */
  @IsNumber()
  languageId!: number;

  /**
   * Name of the step description.
   * Example: Install Wires, Test Server.
   */
  @IsString()
  @MaxLength(255)
  name!: string;

  /**
   * Detailed description of the step (optional).
   */
  @IsOptional()
  @IsString()
  description?: string;
}
