import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Create task mention DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a task mention.
 */
export class CreateTaskMentionDto {
  /**
   * Task ID to which the mention belongs (if tagging in a task).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  taskId?: number;

  /**
   * Comment ID to which the mention belongs (if tagging in a comment).
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  commentId?: number;

  /**
   * User ID of the mentioned user.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  mentionedUserId!: number;

  /**
   * User ID of the creator of the mention.
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
