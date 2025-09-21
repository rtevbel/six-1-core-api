import { IsString, IsNumber, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * Create Project Task Status DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a project task status.
 */
export class CreateProjectTaskStatusDto {
  /**
   * Name of the task status.
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
   * Tenant ID (who owns this task status).
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
   * Project ID (to which this task status belongs).
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
   * Status order (defines the order of the status in the project).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  statusOrder?: number;

  /**
   * Color of the task status.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  color?: string;

  /**
   * Indicates if the status is a system-protected status.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  /**
   * Indicates if the status blocks project completion.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsOptional()
  @IsBoolean()
  blocksCompletion?: boolean;

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
}