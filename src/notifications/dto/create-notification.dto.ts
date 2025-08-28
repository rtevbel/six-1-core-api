import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsDate,
} from 'class-validator';

/**
 * Create notification DTO class.
 *
 * Data transfer object for creating a notification.
 */
export class CreateNotificationDto {
  /**
   * User ID who should receive the notification.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  userId!: number;

  /**
   * Event ID linked to the notification.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number | null}
   */
  @IsNumber()
  @IsOptional()
  eventId!: number | null;

  /**
   * Type of notification.
   *
   * - Required field.
   * - Must be one of the allowed enum values.
   *
   * @type {'push' | 'sms' | 'email' | 'system'}
   */
  @IsEnum(['push', 'sms', 'email', 'system'])
  @IsNotEmpty()
  type!: 'push' | 'sms' | 'email' | 'system';

  /**
   * Subject of the notification.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string | null}
   */
  @IsString()
  @IsOptional()
  subject!: string | null;

  /**
   * Content of the notification.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  message!: string;

  /**
   * Status of the notification.
   *
   * - Optional field.
   * - Must be one of the allowed enum values.
   * - Defaults to 'pending'.
   *
   * @type {'pending' | 'sent' | 'failed'}
   */
  @IsEnum(['pending', 'sent', 'failed'])
  @IsOptional()
  status!: 'pending' | 'sent' | 'failed';

  /**
   * Scheduled time for the notification.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date | null}
   */
  @IsDate()
  @IsOptional()
  scheduledAt!: Date | null;
}
