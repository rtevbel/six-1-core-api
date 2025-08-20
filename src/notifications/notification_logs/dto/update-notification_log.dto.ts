import {
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { CreateNotificationLogDto } from './create-notification_log.dto';
import {PartialType} from "@nestjs/mapped-types";

/**
 * Update notification log DTO class.
 *
 * Data transfer object for updating a notification log.
 */
export class UpdateNotificationLogDto extends PartialType(CreateNotificationLogDto) {
  /**
   * Log ID of the notification log.
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