import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create Notification Channel DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a notification channel.
 */
export class CreateNotificationChannelDto {
  /**
   * Name of the notification channel (e.g., email, SMS, push).
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Description of the notification channel.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * User ID of the creator.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  /**
   * User ID of the updater.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}
