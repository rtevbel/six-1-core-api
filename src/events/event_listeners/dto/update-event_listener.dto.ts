import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateEventListenerDto } from './create-event_listener.dto';

/**
 * Update Event Listener DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating an event listener.
 */
export class UpdateEventListenerDto extends CreateEventListenerDto {
  /**
   * Listener ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  listenerId!: number;
}