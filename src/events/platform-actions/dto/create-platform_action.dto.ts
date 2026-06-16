import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { PlatformActionType } from '../types/platform-action.types';

export class CreatePlatformActionDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  description?: string;

  @IsString()
  @IsIn(['emit_event', 'send_notification'])
  actionType!: PlatformActionType;

  @IsObject()
  @IsNotEmpty()
  config!: Record<string, unknown>;

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
