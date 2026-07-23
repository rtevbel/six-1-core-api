import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
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

  /**
   * Optional JSON Logic filter. Empty string from clients is treated as no filter.
   */
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsObject()
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
