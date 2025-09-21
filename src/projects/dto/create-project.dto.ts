import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsDate,
  IsInt,
} from 'class-validator';

/**
 * Create project DTO class.
 *
 * @version 0.0.2
 *
 * Data transfer object for creating a project.
 */
export class CreateProjectDto {
  /**
   * Name of the project.
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
   * Description of the project.
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
   * Unique identifier for the project.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  projectIdentifier!: string;

  /**
   * Parent project ID (for project phases).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  parentProjectId?: number;

  /**
   * Tenant ID (who owns this project).
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  /**
   * Process template ID (if the project follows a custom workflow).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  processTemplateId?: number;

  /**
   * Indicates if the project is shared across companies.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  /**
   * Current status of the project.
   *
   * - Optional field.
   * - Must be one of the allowed enum values.
   *
   * @type {'active' | 'completed' | 'canceled' | 'on_hold' | 'archived'}
   */
  @IsEnum(['active', 'completed', 'canceled', 'on_hold', 'archived'])
  @IsOptional()
  status?: 'active' | 'completed' | 'canceled' | 'on_hold' | 'archived';

  /**
   * Timestamp when the project was completed.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsOptional()
  completedAt?: Date;

  /**
   * Timestamp when the project was canceled.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsOptional()
  canceledAt?: Date;

  /**
   * Timestamp when the project was put on hold.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsOptional()
  onHoldAt?: Date;

  /**
   * Total number of steps in the project.
   *
   * - Optional field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsOptional()
  stepsTotal?: number;

  /**
   * Number of completed steps in the project.
   *
   * - Optional field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsOptional()
  stepsCompleted?: number;

  /**
   * Total number of tasks in the project.
   *
   * - Optional field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsOptional()
  tasksTotal?: number;

  /**
   * Number of completed tasks in the project.
   *
   * - Optional field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @IsOptional()
  tasksCompleted?: number;

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
   * User ID of the updater.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}