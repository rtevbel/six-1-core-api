import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsArray,
  IsObject,
} from 'class-validator';
/**
 * Create Event Logs DTO class.
 *
 * Data transfer object for creating an event log.
 */
export class CreateEventLogsDto {
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
  eventId?: number;

  /**
   * User ID of the user who triggered the event.
   *
   * - Required field.
   * - Must be a number array.
   *
   * @type {number[]}
   */
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  userIds!: number[];

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
   * JSON payload for the event log.
   *
   * - Optional field.
   * - Must be an object.
   *
   * @type {object}
   */
  @IsOptional()
  @IsObject()
  payload?: object;

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
