import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsDecimal,
  IsDate,
} from 'class-validator';

/**
 * Create task DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a task.
 */
export class CreateTaskDto {
  /**
   * Project ID to which the task belongs.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  /**
   * Unique identifier for the task.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  taskIdentifier!: string;

  /**
   * Name of the task.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Description of the task.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Task status ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  taskStatusId!: number;

  /**
   * Process instance step ID.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  stepInstanceId?: number;

  /**
   * Priority of the task.
   *
   * - Optional field.
   * - Must be one of: `low`, `medium`, `high`.
   * - Default: `medium`.
   *
   * @type {'low' | 'medium' | 'high'}
   */
  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  /**
   * Estimated duration of the task (in hours).
   *
   * - Optional field.
   * - Must be a decimal number.
   *
   * @type {number}
   */
  @IsDecimal()
  @IsOptional()
  estimatedDuration?: number;

  /**
   * Parent task ID (for sub-tasks).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  parentTaskId?: number;

  /**
   * Status control type.
   *
   * - Required field.
   * - Must be one of: `manual`, `process`, `hybrid`.
   * - Default: `manual`.
   *
   * @type {'manual' | 'process' | 'hybrid'}
   */
  @IsEnum(['manual', 'process', 'hybrid'])
  @IsNotEmpty()
  statusControl!: 'manual' | 'process' | 'hybrid';

  /**
   * Status locked until a specific date and time.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsOptional()
  statusLockedUntil?: Date;

  /**
   * User ID of the creator.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  /**
   * User ID of the last updater.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  updatedBy?: number;
}