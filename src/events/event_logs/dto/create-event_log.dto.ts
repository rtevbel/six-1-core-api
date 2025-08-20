import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
/**
 * Create Event Log DTO class.
 *
 * Data transfer object for creating an event log.
 */
export class CreateEventLogDto {
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
   * User ID of the user who triggered the event.
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
   * Entity ID related to the event.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  entityId?: number;

  /**
   * Type of the entity related to the event.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  entityType?: string;

  /**
   * External ID returned by the external notification service.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  externalId?: string;

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
}

