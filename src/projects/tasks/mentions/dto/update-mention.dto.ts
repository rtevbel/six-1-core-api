import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTaskMentionDto } from './create-mention.dto';

/**
 * Update task mention DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a task mention.
 */
export class UpdateTaskMentionDto extends PartialType(CreateTaskMentionDto) {
  /**
   * Mention ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  mentionId!: number;
}
