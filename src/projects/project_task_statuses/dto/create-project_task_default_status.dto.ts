import {IsNumber, IsNotEmpty } from 'class-validator';

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
