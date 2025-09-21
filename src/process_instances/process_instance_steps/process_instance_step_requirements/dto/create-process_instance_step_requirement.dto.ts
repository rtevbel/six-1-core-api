import { IsNumber, IsString, IsObject, IsOptional, IsBoolean, IsEnum } from 'class-validator';

/**
 * DTO for creating a new ProcessInstanceStepRequirement.
 */
export class CreateProcessInstanceStepRequirementDto {
  /**
   * ID of the associated process instance step.
   */
  @IsNumber()
  stepInstanceId!: number;

  /**
   * ID of the associated process template step requirement.
   */
  @IsNumber()
  processTemplateStepRequirementId!: number;

  /**
   * Type of the requirement (e.g., document, approval, etc.).
   */
  @IsString()
  requirementType!: string;

  /**
   * Key of the requirement (e.g., "firewall_config.json").
   */
  @IsString()
  requirementKey!: string;

  /**
   * JSON schema for validation.
   */
  @IsObject()
  jsonSchema!: object;

  /**
   * Indicates if the requirement is mandatory.
   */
  @IsBoolean()
  isMandatory!: boolean;

  /**
   * Status of the requirement.
   */
  @IsEnum(['none', 'pending', 'approved', 'rejected'])
  status!: 'none' | 'pending' | 'approved' | 'rejected';

  /**
   * ID of the last submission (optional).
   */
  @IsOptional()
  @IsNumber()
  lastSubmissionId?: number;

  /**
   * Timestamp when the requirement was approved (optional).
   */
  @IsOptional()
  approvedAt?: Date;

  /**
   * Timestamp when the requirement was last evaluated (optional).
   */
  @IsOptional()
  evaluatedAt?: Date;
}