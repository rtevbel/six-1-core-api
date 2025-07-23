import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Create Notification Template DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a notification template.
 */
export class CreateNotificationTemplateDto {
  /**
   * Name of the notification template.
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
   * Subject of the notification template.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  subject?: string;

  /**
   * Message content of the notification template.
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
   * Channel ID linked to the notification template.
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
