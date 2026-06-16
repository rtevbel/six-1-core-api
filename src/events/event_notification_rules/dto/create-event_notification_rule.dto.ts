import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { RecipientSpec } from '../../notification-rules/recipient-spec.types';

export class CreateEventNotificationRuleDto {
  /**
   * Tenant scope. Omit or `0` for global (super-admin); positive id for tenant rules.
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName!: string;

  @IsObject()
  @IsOptional()
  filterJson?: Record<string, unknown> | null;

  @IsNumber()
  @IsNotEmpty()
  channelId!: number;

  @IsNumber()
  @IsNotEmpty()
  templateId!: number;

  @IsObject()
  @IsNotEmpty()
  recipientSpec!: RecipientSpec;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}
