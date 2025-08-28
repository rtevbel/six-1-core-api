import { IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationChannelDto } from './create-notification_channel.dto';

/**
 * Update Notification Channel DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a notification channel.
 */
export class UpdateNotificationChannelDto extends PartialType(
  CreateNotificationChannelDto,
) {
  /**
   * Notification Channel ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  channelId!: number;
}
