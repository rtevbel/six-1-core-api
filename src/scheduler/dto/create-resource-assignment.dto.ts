import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * Create Resource Assignment DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a resource assignment.
 */
export class CreateResourceAssignmentDto {
  /**
   * Resource ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  resourceId!: number;

  /**
   * Scheduled Task ID.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  scheduledTaskId?: number;

  /**
   * Assigned start time.
   *
   * - Required field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsDateString()
  @IsNotEmpty()
  assignedStart!: string;

  /**
   * Assigned end time.
   *
   * - Required field.
   * - Must be a valid date string.
   *
   * @type {string}
   */
  @IsDateString()
  @IsNotEmpty()
  assignedEnd!: string;
}
