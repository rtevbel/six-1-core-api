import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

type ConfigViewType = 'list' | 'board' | 'detail';

/**
 * Base DTO for scoped view-config contracts keyed by runtime `entityKey`.
 */
class ScopedConfigViewBaseDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  entityKey!: string;
}

export class GetActiveScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsEnum(['list', 'board', 'detail'])
  viewType!: ConfigViewType;
}

export class ListActiveScopedConfigViewsDto extends ScopedConfigViewBaseDto {}

export class UpsertScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsEnum(['list', 'board', 'detail'])
  viewType!: ConfigViewType;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectViewId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsString()
  @IsOptional()
  viewKey?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  roleKey?: string | null;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  configJson?: Record<string, unknown> | null;
}

export class ActivateScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsEnum(['list', 'board', 'detail'])
  viewType!: ConfigViewType;

  @IsInt()
  @Min(1)
  configObjectViewId!: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;
}

export class DeactivateScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsEnum(['list', 'board', 'detail'])
  viewType!: ConfigViewType;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectViewId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;
}
