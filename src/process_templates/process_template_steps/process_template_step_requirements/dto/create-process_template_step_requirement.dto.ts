import { IsNumber, IsString, IsObject, IsOptional } from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateStepRequirement.
 */
export class CreateProcessTemplateStepRequirementDto {
  /**
   * ID of the associated process template step.
   */
  @IsNumber()
  processTemplateStepId!: number;

  /**
   * Type of the requirement — gate types only when gate policy is enforced
   * (`approval`, `payment`, `external_attestation`). Use object bindings for forms.
   */
  @IsString()
  requirementType!: string;

  /**
   * Key of the requirement (e.g., "firewall_config.json", "IT Manager Approval").
   */
  @IsString()
  requirementKey!: string;

  /**
   * JSON schema for validation and events.
   */
  @IsObject()
  jsonSchema!: object;

  /**
   * Tenant User ID who created this requirement.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Tenant User ID who last updated this requirement (optional).
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;
}
