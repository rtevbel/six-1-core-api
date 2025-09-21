import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDate,
} from 'class-validator';

/**
 * DTO for creating a new ProcessInstanceStep.
 */
export class CreateProcessInstanceStepDto {
  /**
   * ID of the associated process instance.
   */
  @IsNumber()
  processInstanceId!: number;

  /**
   * ID of the associated process template step.
   */
  @IsNumber()
  processTemplateStepId!: number;

  /**
   * Name of the step (optional).
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Task type of the step (manual or automated).
   */
  @IsEnum(['manual', 'automated'])
  taskType!: 'manual' | 'automated';

  /**
   * Order of the step in the process.
   */
  @IsInt()
  stepOrder!: number;

  /**
   * Indicates if the step is optional.
   */
  @IsBoolean()
  isOptional!: boolean;

  /**
   * Current status of the step.
   */
  @IsEnum(['pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled'])
  status!: 'pending' | 'ready' | 'in_progress' | 'blocked' | 'completed' | 'canceled';

  /**
   * Reason why the step is blocked (optional).
   */
  @IsOptional()
  @IsString()
  blockedReason?: string;

  /**
   * Timestamp when the step became ready (optional).
   */
  @IsOptional()
  @IsDate()
  readyAt?: Date;

  /**
   * Timestamp when the step started (optional).
   */
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  /**
   * Timestamp when the step was completed (optional).
   */
  @IsOptional()
  @IsDate()
  completedAt?: Date;

  /**
   * Timestamp when the step was canceled (optional).
   */
  @IsOptional()
  @IsDate()
  canceledAt?: Date;
}