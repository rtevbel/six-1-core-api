import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

/**
 * Create Project Task Default Status DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a project task status.
 */
export class CreateProjectTaskDefaultStatusDto {
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
   * Status name (e.g., To-Do, In Progress, etc.).
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
   * Status order (defines the order of status in the project).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  statusOrder?: number;

  /**
   * Color of the status.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  color?: string;

  /**
   * Indicates if the status is a system-protected status.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  /**
   * Indicates if the status blocks project completion.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
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
