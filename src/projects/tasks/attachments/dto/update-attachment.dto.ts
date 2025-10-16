import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { CreateTaskAttachmentDto } from './create-attachment.dto';
/**
 * Update task attachment DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a task attachment.
 */
export class UpdateTaskAttachmentDto extends PartialType(CreateTaskAttachmentDto) {
  /**
   * Attachment ID.
   *
   * - Required field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  attachmentId!: number;
}