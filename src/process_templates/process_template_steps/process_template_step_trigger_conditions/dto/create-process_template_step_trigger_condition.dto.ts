import { IsNumber, IsString, IsObject, IsOptional } from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateStepTriggerCondition.
 */
export class CreateProcessTemplateStepTriggerConditionDto {
  /**
   * ID of the associated process template step.
   */
  @IsNumber()
  processTemplateStepId!: number;

  /**
   * Type of the condition (e.g., task_completion, time_based, manual_approval).
   */
  @IsString()
  conditionType!: string;

  /**
   * Key for the condition (e.g., "firewall_config.json", "IT Manager Approval").
   */
  @IsString()
  conditionKey!: string;

  /**
   * JSON schema containing details of the condition.
   */
  @IsObject()
  jsonSchema!: object;

  /**
   * Tenant User ID who created this condition.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Tenant User ID who last updated this condition (optional).
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;
}