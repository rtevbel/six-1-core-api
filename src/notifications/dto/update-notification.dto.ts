import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

/**
 * Update notification DTO class.
 *
 * Data transfer object for updating a notification.
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  /**
   * Notification ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  notificationId!: number;
}