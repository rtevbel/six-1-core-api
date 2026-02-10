import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * BindNotificationTemplateDto
 *
 * Data transfer object for binding a template to an event and channel.
 */
export class BindNotificationTemplateDto {
  /**
   * Event name to bind.
   */
  @IsString()
  @IsNotEmpty()
  eventName!: string;

  /**
   * Channel name (email, sms, push, system).
   */
  @IsString()
  @IsNotEmpty()
  channelName!: string;

  /**
   * Template name.
   */
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  /**
   * Template subject (optional).
   */
  @IsString()
  @IsOptional()
  subject?: string;

  /**
   * Template message content.
   */
  @IsString()
  @IsNotEmpty()
  message!: string;

  /**
   * Whether the listener is active.
   */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
