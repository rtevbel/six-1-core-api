import {
  IsISO8601, IsNumber, IsOptional
} from 'class-validator';

/**
 * Shift Input DTO class.
 *
 * @description Data transfer object for shift input details.
 */
export class ShiftInputDto {
  /**
   * Resource Assignment ID.
   *
   * - Required field.
   * - Must be an number.
   * - Represents the long-lived task-to-user link (if applicable).
   *
   * @type {number}
   */
  @IsNumber()
  resourceAssignmentId!: number;

  /**
   * Tenant User ID.
   *
   * - Required field.
   * - Must be an number.
   * - Denormalized assignee for fast calendar fit.
   *
   * @type {number}
   */
  @IsNumber()
  tenantUserId!: number;

  /**
   * Planned Start Time (UTC).
   *
   * - Required field.
   * - Must be a valid ISO 8601 date string.
   * - Represents the start of the serial slice.
   *
   * @type {string}
   */
  @IsISO8601()
  plannedStartUtc!: string;

  /**
   * Planned End Time (UTC).
   *
   * - Required field.
   * - Must be a valid ISO 8601 date string.
   * - Represents the end of the serial slice.
   *
   * @type {string}
   */
  @IsISO8601()
  plannedEndUtc!: string;

  /**
   * Sequence Number.
   *
   * - Optional field.
   * - Must be an integer.
   * - Represents the 1..N order within the task.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  sequenceNo?: number;
}