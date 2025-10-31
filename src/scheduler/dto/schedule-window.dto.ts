import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Schedule Window DTO class.
 *
 * @description Data transfer object for scheduling a window.
 */
export class ScheduleWindowDto {
  /**
   * Task ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsNumber()
  @Type(() => Number)
  taskId!: number;

  /**
   * Requested Start Time (UTC).
   *
   * - Required field.
   * - Must be a valid ISO 8601 date string.
   *
   * @type {string}
   */
  @IsISO8601()
  requestedStartUtc!: string;

  /**
   * Requested End Time (UTC).
   *
   * - Required field.
   * - Must be a valid ISO 8601 date string.
   *
   * @type {string}
   */
  @IsISO8601()
  requestedEndUtc!: string;

  /**
   * Priority of the task.
   *
   * - Optional field.
   * - Must be a number greater than or equal to 0.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  /**
   * Parent Scheduled Task ID.
   *
   * - Optional field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsOptional()
  @IsInt()
  parentScheduledTaskId?: number;
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