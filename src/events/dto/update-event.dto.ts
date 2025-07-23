import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

/**
 * Update Event DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating an event.
 */
export class UpdateEventDto extends CreateEventDto {
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
}