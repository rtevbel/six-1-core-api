import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * Create task comment DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a task comment.
 */
export class CreateTaskCommentDto {
  /**
   * Task ID to which the comment belongs.
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
   * Content of the comment.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  comment!: string;

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
   * User ID of the last updater.
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