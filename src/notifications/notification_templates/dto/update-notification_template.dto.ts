import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateNotificationTemplateDto } from './create-notification_template.dto';

/**
 * Update Notification Template DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a notification template.
 */
export class UpdateNotificationTemplateDto extends CreateNotificationTemplateDto {
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