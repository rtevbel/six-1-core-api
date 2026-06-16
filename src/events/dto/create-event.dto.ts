import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsObject,
  IsIn,
} from 'class-validator';
import {
  EVENT_CATALOG_CATEGORIES,
  type EventCatalogCategory,
} from '../constants/event-catalog.constants';
import type { EventPayloadSchema } from '../interfaces/event-payload-schema.interface';

/**
 * Create Event DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating an event catalog entry.
 */
export class CreateEventDto {
  /**
   * Name of the event.
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
   * Description of the event.
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
   * Catalog grouping for admin UI and rule matching.
   */
  @IsOptional()
  @IsIn([...EVENT_CATALOG_CATEGORIES])
  category?: EventCatalogCategory;

  /**
   * Payload contract version (semver-style string).
   */
  @IsOptional()
  @IsString()
  schemaVersion?: string;

  /**
   * Optional JSON Schema describing the event `data` payload.
   */
  @IsOptional()
  @IsObject()
  payloadSchema?: EventPayloadSchema;

  /**
   * When true, marks a system-managed catalog entry (seeded / platform-owned).
   */
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

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
