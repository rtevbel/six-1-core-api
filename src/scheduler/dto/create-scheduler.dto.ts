// Import validation decorators from class-validator
import { IsISO8601, IsOptional, IsNumber, Min , IsNotEmpty } from 'class-validator';
// Data Transfer Object (DTO) for scheduling a task window
export class CreateSchedulerDto {
  // Task ID (required, must be an number)
  @IsNumber()
  taskId!: number;
  
  // Requested start time in ISO 8601 format (required)
  @IsISO8601()
  requestedStartUtc!: string;

  // Requested end time in ISO 8601 format (required)
  @IsISO8601()
  requestedEndUtc!: string;

  // Optional priority (must be a number, minimum value is 0)
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

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
