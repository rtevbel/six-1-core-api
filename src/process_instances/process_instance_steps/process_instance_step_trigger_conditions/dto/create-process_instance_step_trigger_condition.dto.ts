import { IsNumber, IsString, IsObject, IsOptional, IsEnum, IsDate } from 'class-validator';

/**
 * DTO for creating a new ProcessInstanceStepTrigger.
 */
export class CreateProcessInstanceStepTriggerDto {
  /**
   * ID of the associated process instance step.
   */
  @IsNumber()
  stepInstanceId!: number;

  /**
   * ID of the associated process template step trigger condition.
   */
  @IsNumber()
  processTemplateStepTriggerConditionId!: number;

  /**
   * Type of the condition (e.g., task_completion, time_based).
   */
  @IsString()
  conditionType!: string;

  /**
   * Key for the condition (e.g., "firewall_config.json").
   */
  @IsString()
  conditionKey!: string;

  /**
   * JSON schema containing details of the condition.
   */
  @IsObject()
  jsonSchema!: object;

  /**
   * Status of the trigger condition (default: 'unmet').
   */
  @IsOptional()
  @IsEnum(['unmet', 'met'])
  status?: 'unmet' | 'met';

  /**
   * Timestamp when the condition was met (optional).
   */
  @IsOptional()
  @IsDate()
  metAt?: Date | null;

  /**
   * Timestamp of the last evaluation (optional).
   */
  @IsOptional()
  @IsDate()
  lastEvalAt?: Date | null;
}