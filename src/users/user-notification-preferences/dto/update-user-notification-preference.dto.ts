// src/dto/update-user-notification-preference.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateUserNotificationPreferenceDto } from './create-user-notification-preference.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for updating a user notification preference.
 * Extends the CreateUserNotificationPreferenceDto and makes all fields optional.
 */
export class UpdateUserNotificationPreferenceDto extends PartialType(
  CreateUserNotificationPreferenceDto,
) {
  /**
   * The ID of the user preference entry.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  preference_id!: number;
}
