import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
} from 'class-validator';

/**
 * Create Project Step Status Mapping DTO.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a project step status mapping.
 */
export class CreateProjectStepStatusMappingDto {
  /**
   * Project ID.
   *
   * - Required field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  projectId!: number;

  /**
   * Process template Step Instance ID.
   *
   * - Optional field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  processTemplateStepInstanceId?: number;

  /**
   * Step Engine State.
   *
   * - Required field.
   * - Must be one of the allowed enum values.
   *
   * @type {'pending' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'canceled'}
   */
  @IsNotEmpty()
  @IsEnum([
    'pending',
    'ready',
    'in_progress',
    'completed',
    'blocked',
    'canceled',
  ])
  stepEngineState!:
    | 'pending'
    | 'ready'
    | 'in_progress'
    | 'completed'
    | 'blocked'
    | 'canceled';

  /**
   * Task Status ID.
   *
   * - Required field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  taskStatusId!: number;
}
