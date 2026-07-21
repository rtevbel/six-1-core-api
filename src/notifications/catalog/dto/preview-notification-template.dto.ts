import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { EventEnvelope } from '../../../events/types';

export class PreviewNotificationTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string | null;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsInt()
  @Min(1)
  recipientUserId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  eventLogId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tenantId?: number;

  /** Sample EventEnvelope; validated as a plain object (not nested DTO). */
  @IsOptional()
  @IsObject()
  envelope?: EventEnvelope;
}
