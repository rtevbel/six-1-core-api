import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateNotificationTemplateDto } from './create-notification_template.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update Notification Template DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a notification template.
 */
export class UpdateNotificationTemplateDto extends PartialType(
  CreateNotificationTemplateDto,
) {
  /**
   * Notification Template ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  templateId!: number;
}
