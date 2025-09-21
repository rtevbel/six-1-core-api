import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
/**
 * Create Event Log DTO class.
 *
 * Data transfer object for creating an event log.
 */
export class CreateEventLogDto {
  /**
   * Event ID.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  eventId!: number;

  /**
   * User ID of the user who triggered the event.
   *
   * - Required field.
   * - Must be a number array.
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
   * Status of the event log.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  status?: number;

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
   * JSON schema.
   */
  @IsOptional()
  @IsObject()
  payload?: object;

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
