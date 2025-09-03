import { IsString, IsOptional, IsNumber, IsNotEmpty, IsBoolean } from 'class-validator';

/**
 * Create project DTO class.
 *
 * @version 0.0.1
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