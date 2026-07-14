// src/dto/update-user-notification-preference.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateUserNotificationPreferenceDto } from './create-user-notification-preference.dto';
import { IsNotEmpty, IsNumberString } from 'class-validator';
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
   * - Must be a numeric string (bigint primary key).
   *
   * @type {string}
   */
  @IsNotEmpty()
  @Type(() => String)
  @IsNumberString()
  preferenceId!: string;
}
