import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

/**
 * Update task DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a task.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  /**
   * Task ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

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
