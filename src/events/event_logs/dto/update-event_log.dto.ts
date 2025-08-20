import {IsNumber, IsNotEmpty } from 'class-validator';
import { CreateEventLogDto } from './create-event_log.dto';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Update Event Log DTO class.
 *
 * Data transfer object for updating an event log.
 */
export class UpdateEventLogDto extends PartialType(CreateEventLogDto) {
  /**
   * Log ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  logId!: number;
}