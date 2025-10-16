import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTaskCommentDto } from './create-comment.dto';

/**
 * Update task comment DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a task comment.
 */
export class UpdateTaskCommentDto extends PartialType(CreateTaskCommentDto) {
  /**
   * Comment ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  commentId!: number;
}