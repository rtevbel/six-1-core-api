import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SYSTEM_SETTING_VALUE_TYPES,
  SystemSettingValueType,
} from '../constants';

export class CreateSystemSettingDefinitionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  groupId!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  settingKey!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNotEmpty()
  @IsIn(SYSTEM_SETTING_VALUE_TYPES)
  valueType!: SystemSettingValueType;

  @IsOptional()
  @IsObject()
  constraintsJson?: Record<string, unknown>;

  @IsOptional()
  defaultValue?: unknown;

  @IsOptional()
  @IsBoolean()
  isTenantOverridable?: boolean;

  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSystemSettingDefinitionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  definitionId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsIn(SYSTEM_SETTING_VALUE_TYPES)
  valueType?: SystemSettingValueType;

  @IsOptional()
  @IsObject()
  constraintsJson?: Record<string, unknown> | null;

  @IsOptional()
  defaultValue?: unknown;

  @IsOptional()
  @IsBoolean()
  isTenantOverridable?: boolean;

  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FindSystemSettingDefinitionsFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  settingKey?: string;

  @IsOptional()
  @IsIn(SYSTEM_SETTING_VALUE_TYPES)
  valueType?: SystemSettingValueType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isTenantOverridable?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
