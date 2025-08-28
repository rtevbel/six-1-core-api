import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';

/**
 * Create notification log DTO class.
 *
 * Data transfer object for creating a notification log.
 */
export class CreateNotificationLogDto {
  /**
   * Notification ID linked to the log.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  notificationId!: number;

  /**
   * Channel ID used for the notification.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  channelId!: number;

  /**
   * Status of the notification attempt.
   *
   * - Required field.
   * - Must be one of the allowed enum values.
   *
   * @type {'pending' | 'sent' | 'failed'}
   */
  @IsEnum(['pending', 'sent', 'failed'])
  @IsNotEmpty()
  status!: 'pending' | 'sent' | 'failed';

  /**
   * Response from the notification service.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string | null}
   */
  @IsString()
  @IsOptional()
  response!: string | null;
}
