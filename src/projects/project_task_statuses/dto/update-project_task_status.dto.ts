import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { CreateProjectTaskStatusDto } from './create-project_task_status.dto';

/**
 * Update Project Task Status DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a project task status.
 */
export class UpdateProjectTaskStatusDto extends PartialType(CreateProjectTaskStatusDto) {
  /**
   * Task Status ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  projectTaskStatusId!: number;

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