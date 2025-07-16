// src/dto/create-user-notification-preference.dto.ts

import {
  IsNotEmpty,
  IsNumberString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import {Type} from "class-transformer";

/**
 * Data Transfer Object for creating a user notification preference.
 * Validates the input data for creating a new preference.
 */
export class CreateUserNotificationPreferenceDto {
  /**
   * ID of the user associated with the notification preference.
   * Must be a non-empty string containing numeric characters only.
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumberString()
  userId!: number;

  /**
   * ID of the notification channel associated with the preference.
   * Must be a non-empty string containing numeric characters only.
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumberString()
  channelId!: number;

  /**
   * Indicates whether the notification preference is enabled.
   * Optional field, defaults to `true` if not provided.
   * Must be a boolean value if specified.
   */
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = true;
}
