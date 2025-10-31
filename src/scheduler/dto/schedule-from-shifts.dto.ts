import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ShiftInputDto } from './shift-Input.dto';

/**
 * Schedule From Shifts DTO class.
 *
 * @description Data transfer object for scheduling tasks from shifts.
 */
export class ScheduleFromShiftsDto {
  /**
   * Task ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsNumber()
  taskId!: number;

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
   * List of shifts associated with the task.
   *
   * - Required field.
   * - Must be an array of `ShiftInputDto` objects.
   * - Each shift must be validated.
   *
   * @type {ShiftInputDto[]}
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftInputDto)
  shifts!: ShiftInputDto[];
}