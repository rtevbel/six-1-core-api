import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SetSystemSettingValueDto {
  @ValidateIf((o: SetSystemSettingValueDto) => !o.settingKey)
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  definitionId?: number;

  @ValidateIf((o: SetSystemSettingValueDto) => !o.definitionId)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  settingKey?: string;

  /** Value to store (plaintext for secrets; encrypted in service). */
  @IsNotEmpty()
  value!: unknown;

  /**
   * Target tenant. Omit / 0 = global (requires settings.manage).
   * Positive = tenant override (requires settings.update + is_tenant_overridable).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;
}

export class ClearSystemSettingValueDto {
  @ValidateIf((o: ClearSystemSettingValueDto) => !o.settingKey)
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  definitionId?: number;

  @ValidateIf((o: ClearSystemSettingValueDto) => !o.definitionId)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  settingKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;
}

export class FindSystemSettingValuesFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  settingKeys?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 100;
}

export class ResolveSystemSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  settingKeys?: string[];

  /** Internal/trusted callers only — decrypts secret values. */
  @IsOptional()
  @IsBoolean()
  includeSecrets?: boolean;
}
