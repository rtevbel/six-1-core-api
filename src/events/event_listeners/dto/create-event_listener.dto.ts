import { IsNumber, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Create Event Listener DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating an event listener.
 */
export class CreateEventListenerDto {
  /**
   * Event ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  eventId!: number;

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

  /**
   * Whether the listener is active.
   *
   * - Optional field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
